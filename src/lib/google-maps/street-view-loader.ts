/// <reference types="google.maps" />

declare global {
  interface Window {
    google?: typeof google;
  }
}

let loadPromise: Promise<void> | null = null;

export async function loadGoogleMapsAPI(apiKey: string): Promise<void> {
  if (window.google?.maps) return;

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Google Maps API'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function isGoogleMapsLoaded(): boolean {
  return !!window.google?.maps;
}

export interface StreetViewConfig {
  container: HTMLElement;
  lat: number;
  lng: number;
  heading?: number;
  pitch?: number;
  zoom?: number;
  panoId?: string;
}

export function createStreetViewPanorama(config: StreetViewConfig): google.maps.StreetViewPanorama | null {
  if (!window.google?.maps) {
    console.error('Google Maps API not loaded');
    return null;
  }

  if (!config.container || config.container.offsetWidth === 0 || config.container.offsetHeight === 0) {
    console.warn('Street View container has no dimensions - ensure container is visible and rendered before initialization');
    return null;
  }

  const panoramaOptions: google.maps.StreetViewPanoramaOptions = {
    pov: {
      heading: config.heading || 90,
      pitch: config.pitch || 0,
    },
    zoom: config.zoom || 1,
    addressControl: false,
    showRoadLabels: false,
    motionTracking: false,
    motionTrackingControl: false,
    visible: true,
  };

  if (config.panoId) {
    panoramaOptions.pano = config.panoId;
  } else {
    panoramaOptions.position = { lat: config.lat, lng: config.lng };
  }

  const panorama = new window.google.maps.StreetViewPanorama(config.container, panoramaOptions);

  return panorama;
}

export function normalizeHeading(heading: number): number {
  while (heading < 0) heading += 360;
  while (heading >= 360) heading -= 360;
  return heading;
}

export interface StreetViewStatus {
  available: boolean;
  nearestPanoId?: string;
  nearestLocation?: { lat: number; lng: number };
  error?: string;
}

export async function checkStreetViewCoverage(
  lat: number,
  lng: number,
  radius = 200
): Promise<StreetViewStatus> {
  if (!window.google?.maps) {
    return { available: false, error: 'Google Maps API not loaded' };
  }

  return new Promise((resolve) => {
    const streetViewService = new window.google.maps.StreetViewService();
    
    streetViewService.getPanorama(
      {
        location: { lat, lng },
        radius,
        preference: window.google.maps.StreetViewPreference.NEAREST,
        source: window.google.maps.StreetViewSource.OUTDOOR,
      },
      (data, status) => {
        if (status === window.google.maps.StreetViewStatus.OK && data) {
          resolve({
            available: true,
            nearestPanoId: data.location?.pano,
            nearestLocation: data.location?.latLng 
              ? { lat: data.location.latLng.lat(), lng: data.location.latLng.lng() }
              : undefined,
          });
        } else {
          resolve({
            available: false,
            error: status === window.google.maps.StreetViewStatus.ZERO_RESULTS
              ? 'No Street View coverage at this location'
              : 'Failed to check Street View availability',
          });
        }
      }
    );
  });
}
