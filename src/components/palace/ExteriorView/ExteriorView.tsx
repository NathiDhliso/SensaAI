import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
    MapPin,
    ExternalLink,
    Target,
    Footprints,
    BarChart3,
    Map,
    Loader2,
    Navigation,
    Edit3,
    Save
} from 'lucide-react';
import { usePalaceStore } from '@/store/palace-store';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { getRouteById, getStreetViewUrl } from '@/constants/palace-routes';
import {
    loadGoogleMapsAPI,
    isGoogleMapsLoaded,
    createStreetViewPanorama,
    checkStreetViewCoverage,
    calculateMarkerPositions,
    type MarkerPosition
} from '@/lib/google-maps';
// Corrected imports for moved file location
import ConceptMarker from '../ConceptMarker';
import { CinematicView } from '../CinematicView/CinematicView';
import GuidedTour from '../GuidedTour';
import LifecycleCard from '../LifecycleCard';
import DailyWalk from '../DailyWalk';
import QuizMode from '../QuizMode';
import ProgressPanel from '../ProgressPanel';
import { PlacementGuide } from '../PlacementGuide';
import RoutePreviewCard from '../RoutePreviewCard';
import { PanoramaPalaceView } from '../PanoramaViewer';
import { StaticPanoramaView } from '../PanoramaViewer';
import { hasPanorama, getPrebuiltPanoramaUrl } from '@/lib/panorama';
import { UI_TIMINGS } from '@/constants/ui-constants';
import { GOOGLE_MAPS_API_KEY } from '@/constants/app-config';
import styles from './ExteriorView.module.css';

export default function ExteriorView() {
    const navigate = useNavigate();
    const { currentPalace, currentBuildingIndex, setCurrentBuilding, updateStreak, customRoutes, updatePlacementPosition, placementOverrides } = usePalaceStore();
    const [showQuiz, setShowQuiz] = useState(false);
    const [showProgress, setShowProgress] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showRoutePreview, setShowRoutePreview] = useState(false);

    const streetViewRef = useRef<HTMLDivElement>(null);
    const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [markerPositions, setMarkerPositions] = useState<MarkerPosition[]>([]);
    const [activeConcept, setActiveConcept] = useState<string | null>(null);
    const [streetViewEnabled, setStreetViewEnabled] = useState(!!GOOGLE_MAPS_API_KEY);
    const [showTooltip, setShowTooltip] = useState(false);
    const [showTour, setShowTour] = useState(false);
    const [tourPlaying, setTourPlaying] = useState(false);
    const [tourIndex, setTourIndex] = useState(0);
    const tourIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const fullscreenRef = useRef<HTMLDivElement>(null);
    const [editMode, setEditMode] = useState(false);
    const [hasPanoramaImage, setHasPanoramaImage] = useState(false);
    const [panoramaCheckCount, setPanoramaCheckCount] = useState(0);
    const [prebuiltPanoramaUrl, setPrebuiltPanoramaUrl] = useState<string | null>(null);

    // Escape key exits Palace view (unless modals are open)
    const hasOpenModal = showQuiz || showProgress || showGuide || showRoutePreview || showTooltip;
    useEscapeKey(() => navigate('/learn'), !hasOpenModal);

    // Compute route and building info first (needed by effects below)
    const route = currentPalace
        ? (getRouteById(currentPalace.routeId) || customRoutes.find(r => r.id === currentPalace.routeId))
        : null;
    const currentBuilding = currentPalace?.buildings[currentBuildingIndex];
    const routeBuilding = route?.buildings.find(b => b.id === currentBuilding?.routeBuildingId);

    useEffect(() => {
        const hasSeenGuide = localStorage.getItem('palace-guide-seen');
        if (!hasSeenGuide && currentPalace) {
            setShowGuide(true);
            localStorage.setItem('palace-guide-seen', 'true');
        }
    }, [currentPalace]);

    // Show Route Preview Card only on first-ever palace visit (Advance Organizer - CLT)
    // Once seen for any palace, don't show again on subsequent palace visits
    useEffect(() => {
        if (!currentPalace) return;
        const globalPreviewKey = 'palace-preview-ever-seen';
        const hasEverSeenPreview = localStorage.getItem(globalPreviewKey);
        if (!hasEverSeenPreview) {
            setShowRoutePreview(true);
        }
    }, [currentPalace]);

    const dismissRoutePreview = useCallback(() => {
        if (!currentPalace) return;
        const globalPreviewKey = 'palace-preview-ever-seen';
        localStorage.setItem(globalPreviewKey, 'true');
        setShowRoutePreview(false);
    }, [currentPalace]);

    // Check for pre-built panorama images (from public/panoramas folder)
    useEffect(() => {
        if (!currentPalace || !routeBuilding) {
            setPrebuiltPanoramaUrl(null);
            return;
        }

        // Check if pre-built route has a static panorama
        const isPrebuiltRoute = !currentPalace.routeId.startsWith('custom-');
        if (isPrebuiltRoute) {
            const url = getPrebuiltPanoramaUrl(currentPalace.routeId, routeBuilding.id);
            setPrebuiltPanoramaUrl(url);
        } else {
            setPrebuiltPanoramaUrl(null);
        }
    }, [currentPalace?.routeId, routeBuilding?.id]);

    // Check for panorama in IndexedDB (for custom routes)
    useEffect(() => {
        let retryTimeout: ReturnType<typeof setTimeout>;

        async function checkPanorama() {
            if (!currentPalace || !routeBuilding) {
                setHasPanoramaImage(false);
                return;
            }

            // Only check IndexedDB for custom routes
            const isCustomRoute = currentPalace.routeId.startsWith('custom-');
            if (!isCustomRoute) {
                setHasPanoramaImage(false);
                return;
            }

            const exists = await hasPanorama(currentPalace.id, routeBuilding.id);
            setHasPanoramaImage(exists);

            // Retry logic for async capture
            if (!exists && panoramaCheckCount < 5) {
                retryTimeout = setTimeout(() => {
                    setPanoramaCheckCount(c => c + 1);
                }, 1000);
            }
        }
        checkPanorama();

        return () => {
            if (retryTimeout) clearTimeout(retryTimeout);
        };
    }, [currentPalace?.id, currentPalace?.routeId, routeBuilding?.id, panoramaCheckCount]);

    const handleOpenStreetView = useCallback(() => {
        if (!routeBuilding) return;
        const url = getStreetViewUrl(
            routeBuilding.coordinates.lat,
            routeBuilding.coordinates.lng,
            routeBuilding.heading
        );
        window.open(url, '_blank');
    }, [routeBuilding]);

    const updateMarkerPositions = useCallback(() => {
        if (!panoramaRef.current || !currentBuilding || !routeBuilding || !currentPalace) return;

        const container = streetViewRef.current;
        if (!container) return;

        const palaceOverrides = placementOverrides[currentPalace.id];
        const buildingOverrides = palaceOverrides?.[routeBuilding.id] || {};

        const placementsWithOverrides = routeBuilding.placements.map(slot => {
            const override = buildingOverrides[slot.id];
            if (override) {
                return { ...slot, headingOffset: override.headingOffset, pitch: override.pitch };
            }
            return slot;
        });

        const pov = panoramaRef.current.getPov();
        const positions = calculateMarkerPositions(
            currentBuilding.concepts,
            placementsWithOverrides,
            {
                containerWidth: container.offsetWidth,
                containerHeight: container.offsetHeight,
                currentHeading: pov.heading || 0,
                currentPitch: pov.pitch || 0,
                fov: 90,
                buildingHeading: routeBuilding.heading,
            }
        );
        setMarkerPositions(positions);
    }, [currentBuilding, routeBuilding, currentPalace, placementOverrides]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
            setTimeout(updateMarkerPositions, UI_TIMINGS.MARKER_UPDATE_SLOW);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [updateMarkerPositions]);

    useEffect(() => {
        // Skip live Street View if we have a captured panorama image
        if (hasPanoramaImage || !streetViewEnabled || !routeBuilding || !streetViewRef.current) return;

        const initStreetView = async () => {
            setIsLoading(true);
            setLoadError(null);

            try {
                if (!isGoogleMapsLoaded()) {
                    await loadGoogleMapsAPI(GOOGLE_MAPS_API_KEY);
                }

                const coverage = await checkStreetViewCoverage(
                    routeBuilding.coordinates.lat,
                    routeBuilding.coordinates.lng
                );

                if (!coverage.available) {
                    setLoadError(coverage.error || 'No Street View coverage at this location');
                    setStreetViewEnabled(false);
                    return;
                }

                if (panoramaRef.current) {
                    if (coverage.nearestPanoId) {
                        panoramaRef.current.setPano(coverage.nearestPanoId);
                    } else {
                        panoramaRef.current.setPosition({
                            lat: routeBuilding.coordinates.lat,
                            lng: routeBuilding.coordinates.lng,
                        });
                    }
                    panoramaRef.current.setPov({
                        heading: routeBuilding.heading,
                        pitch: 0,
                    });
                } else {
                    // Wait for container to have dimensions before initializing
                    let retries = 0;
                    const maxRetries = 10;
                    while (retries < maxRetries) {
                        const container = streetViewRef.current;
                        if (container && container.offsetWidth > 0 && container.offsetHeight > 0) {
                            break;
                        }
                        await new Promise(resolve => setTimeout(resolve, 100));
                        retries++;
                    }

                    const container = streetViewRef.current;
                    if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
                        console.warn('Street View container still has no dimensions after retries');
                        setIsLoading(false);
                        return;
                    }

                    const panorama = createStreetViewPanorama({
                        container: container,
                        lat: routeBuilding.coordinates.lat,
                        lng: routeBuilding.coordinates.lng,
                        heading: routeBuilding.heading,
                        panoId: coverage.nearestPanoId,
                    });

                    if (panorama) {
                        panoramaRef.current = panorama;
                        panorama.addListener('pov_changed', updateMarkerPositions);
                        panorama.addListener('position_changed', updateMarkerPositions);
                    } else {
                        throw new Error('Failed to create Street View panorama');
                    }
                }

                setTimeout(updateMarkerPositions, UI_TIMINGS.MAP_LOAD_DELAY);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to load Street View';
                setLoadError(`${message}. Using fallback mode.`);
                setStreetViewEnabled(false);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(initStreetView, 50);

        return () => {
            clearTimeout(timer);
            if (panoramaRef.current) {
                google.maps.event.clearListeners(panoramaRef.current, 'pov_changed');
                google.maps.event.clearListeners(panoramaRef.current, 'position_changed');
            }
        };
    }, [routeBuilding, streetViewEnabled, updateMarkerPositions, hasPanoramaImage]);

    const handleMarkerClick = (conceptId: string, heading: number) => {
        setActiveConcept(conceptId);
        setShowTooltip(true);

        if (panoramaRef.current) {
            const currentPov = panoramaRef.current.getPov();
            panoramaRef.current.setPov({
                heading: heading,
                pitch: currentPov.pitch,
            });
        }

        const conceptCard = document.getElementById(`concept-${conceptId}`);
        conceptCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const startTour = () => {
        setShowTour(true);
        setTourPlaying(true);
        setTourIndex(0);
        if (markerPositions.length > 0) {
            handleMarkerClick(markerPositions[0].conceptId, markerPositions[0].heading);
        }
    };

    const stopTour = () => {
        setTourPlaying(false);
        if (tourIntervalRef.current) {
            clearInterval(tourIntervalRef.current);
            tourIntervalRef.current = null;
        }
    };

    const closeTour = () => {
        stopTour();
        setShowTour(false);
    };

    const tourIndexRef = useRef(tourIndex);
    tourIndexRef.current = tourIndex;

    const nextTourConcept = useCallback(() => {
        const nextIndex = tourIndexRef.current + 1;
        if (nextIndex < markerPositions.length) {
            setTourIndex(nextIndex);
            const marker = markerPositions[nextIndex];
            if (marker) {
                handleMarkerClick(marker.conceptId, marker.heading);
            }
        } else {
            stopTour();
        }
    }, [markerPositions]);

    const prevTourConcept = useCallback(() => {
        const prevIndex = tourIndexRef.current - 1;
        if (prevIndex >= 0) {
            setTourIndex(prevIndex);
            const marker = markerPositions[prevIndex];
            if (marker) {
                handleMarkerClick(marker.conceptId, marker.heading);
            }
        }
    }, [markerPositions]);

    const selectTourConcept = useCallback((index: number) => {
        setTourIndex(index);
        const marker = markerPositions[index];
        if (marker) {
            handleMarkerClick(marker.conceptId, marker.heading);
        }
    }, [markerPositions]);

    useEffect(() => {
        if (!tourPlaying || markerPositions.length === 0) {
            return;
        }

        tourIntervalRef.current = setInterval(() => {
            const nextIndex = tourIndexRef.current + 1;
            if (nextIndex < markerPositions.length) {
                setTourIndex(nextIndex);
                const marker = markerPositions[nextIndex];
                if (marker) {
                    handleMarkerClick(marker.conceptId, marker.heading);
                }
            } else {
                stopTour();
            }
        }, 8000);

        return () => {
            if (tourIntervalRef.current) {
                clearInterval(tourIntervalRef.current);
                tourIntervalRef.current = null;
            }
        };
    }, [tourPlaying, markerPositions]);

    const [isStartingWalk, setIsStartingWalk] = useState(false);

    // Effect to trigger tour when starting walk
    useEffect(() => {
        if (isStartingWalk && markerPositions.length > 0 && !isLoading) {
            startTour();
            setIsStartingWalk(false);
        }
    }, [isStartingWalk, markerPositions, isLoading]);

    const handleStartWalk = useCallback((startBuildingIndex: number) => {
        if (!currentPalace) return;
        updateStreak();

        // Switch building
        const buildingIndex = startBuildingIndex % currentPalace.buildings.length;
        setCurrentBuilding(buildingIndex);

        // Flag to start tour once loaded
        setIsStartingWalk(true);
    }, [currentPalace, updateStreak, setCurrentBuilding]);

    const toggleFullscreen = useCallback(() => {
        if (!fullscreenRef.current) return;

        if (!document.fullscreenElement) {
            fullscreenRef.current.requestFullscreen().then(() => {
                setIsFullscreen(true);
                setTimeout(updateMarkerPositions, UI_TIMINGS.MARKER_UPDATE_FAST);
            }).catch(() => { });
        } else {
            document.exitFullscreen().then(() => {
                setIsFullscreen(false);
                setTimeout(updateMarkerPositions, UI_TIMINGS.MARKER_UPDATE_FAST);
            }).catch(() => { });
        }
    }, [updateMarkerPositions]);

    const handleMarkerDragEnd = useCallback((conceptId: string, deltaX: number, deltaY: number) => {
        if (!routeBuilding || !currentBuilding || !streetViewRef.current || !currentPalace) return;

        const container = streetViewRef.current;
        const fov = 90;

        const headingChange = (deltaX / container.offsetWidth) * fov;
        const pitchChange = -(deltaY / container.offsetHeight) * 45;

        const concept = currentBuilding.concepts.find(c => c.conceptId === conceptId);
        if (!concept) return;

        const slot = routeBuilding.placements.find(p => p.id === concept.slotId);
        if (!slot) return;

        const palaceOverrides = placementOverrides[currentPalace.id];
        const buildingOverrides = palaceOverrides?.[routeBuilding.id] || {};
        const existingOverride = buildingOverrides[concept.slotId];

        const currentHeadingOffset = existingOverride?.headingOffset ?? slot.headingOffset ?? 0;
        const currentPitch = existingOverride?.pitch ?? slot.pitch ?? 0;

        const newHeadingOffset = currentHeadingOffset + headingChange;
        const newPitch = Math.max(-30, Math.min(30, currentPitch + pitchChange));

        updatePlacementPosition(routeBuilding.id, concept.slotId, newHeadingOffset, newPitch);
    }, [routeBuilding, currentBuilding, currentPalace, placementOverrides, updatePlacementPosition]);

    if (!currentPalace) {
        return (
            <div className={styles.palaceContainer}>
                <div className={styles.emptyState}>
                    <Map size={64} strokeWidth={1} />
                    <h2>No Memory Palace Active</h2>
                    <p>Generate learning content first, then create a Memory Palace from the Results page.</p>
                    <button
                        className={styles.openMapsButton}
                        onClick={() => navigate('/')}
                    >
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    if (!route) {
        return (
            <div className={styles.palaceContainer}>
                <div className={styles.emptyState}>
                    <Map size={64} strokeWidth={1} />
                    <h2>Route Not Found</h2>
                    <p>The route for this Memory Palace could not be found. Please create a new palace.</p>
                    <button
                        className={styles.openMapsButton}
                        onClick={() => navigate('/results')}
                    >
                        Go to Results
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.palaceContainer}>
            {/* Quiz Mode Overlay */}
            {showQuiz && <QuizMode onClose={() => setShowQuiz(false)} />}

            {/* Placement Guide Overlay */}
            <PlacementGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />

            {/* Route Preview Card - Advance Organizer (CLT) */}
            <AnimatePresence>
                {showRoutePreview && currentPalace && route && (
                    <RoutePreviewCard
                        routeName={route.name}
                        buildingCount={currentPalace.buildings.length}
                        conceptCount={currentPalace.buildings.reduce(
                            (sum, b) => sum + b.concepts.length, 0
                        )}
                        onStart={dismissRoutePreview}
                    />
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className={styles.mainContent}>
                {/* Street View Panel */}
                <div className={styles.streetViewPanel}>
                    <DailyWalk onStartWalk={handleStartWalk} />

                    {/* Priority 1: Pre-built panorama from public folder */}
                    {prebuiltPanoramaUrl && currentBuilding && routeBuilding ? (
                        <div className={styles.streetViewWrapper}>
                            <StaticPanoramaView
                                imageUrl={prebuiltPanoramaUrl}
                                routeBuildingId={routeBuilding.id}
                                concepts={currentBuilding.concepts.map(c => ({
                                    conceptId: c.conceptId,
                                    conceptName: c.conceptName,
                                    slotId: c.slotId,
                                }))}
                                fullConceptData={currentBuilding.concepts}
                                lifecycleLabels={currentPalace?.lifecycleLabels}
                                onMarkerClick={(conceptId) => {
                                    setActiveConcept(conceptId);
                                    setShowTooltip(true);
                                }}
                            />
                        </div>
                    ) : /* Priority 2: Custom route panorama from IndexedDB */
                        hasPanoramaImage && currentPalace && routeBuilding && currentBuilding ? (
                            <div className={styles.streetViewWrapper}>
                                <PanoramaPalaceView
                                    palaceId={currentPalace.id}
                                    routeBuildingId={routeBuilding.id}
                                    concepts={currentBuilding.concepts.map(c => ({
                                        conceptId: c.conceptId,
                                        conceptName: c.conceptName,
                                        slotId: c.slotId,
                                    }))}
                                    fullConceptData={currentBuilding.concepts}
                                    lifecycleLabels={currentPalace?.lifecycleLabels}
                                    onMarkerClick={(conceptId) => {
                                        setActiveConcept(conceptId);
                                        setShowTooltip(true);
                                    }}
                                />
                            </div>
                        ) : /* Priority 3: Live Google Street View */
                            streetViewEnabled ? (
                                <div
                                    ref={fullscreenRef}
                                    className={`${styles.streetViewWrapper} ${isFullscreen ? styles.fullscreenMode : ''}`}
                                >
                                    <div ref={streetViewRef} className={styles.streetViewContainer} />

                                    {isLoading && (
                                        <div className={styles.streetViewLoading}>
                                            <Loader2 size={32} className={styles.spinner} />
                                            <span>Loading Street View...</span>
                                            <span className={styles.loadingHint}>
                                                Ensure Google Maps API key is configured
                                            </span>
                                        </div>
                                    )}

                                    {!isLoading && (
                                        <div className={`${styles.markerOverlay} ${isFullscreen ? styles.markerOverlayFullscreen : ''} ${editMode ? styles.markerOverlayEdit : ''}`}>
                                            {markerPositions.map(marker => (
                                                <ConceptMarker
                                                    key={marker.conceptId}
                                                    marker={marker}
                                                    isActive={activeConcept === marker.conceptId}
                                                    onClick={() => handleMarkerClick(marker.conceptId, marker.heading)}
                                                    hideTooltip={showTour || editMode}
                                                    editMode={editMode}
                                                    onDragEnd={handleMarkerDragEnd}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    <div className={`${styles.streetViewControls} ${isFullscreen ? styles.streetViewControlsFullscreen : ''}`}>
                                        <button
                                            className={`${styles.controlBtn} ${editMode ? styles.controlBtnActive : ''}`}
                                            onClick={() => setEditMode(!editMode)}
                                            title={editMode ? "Save & Exit Edit Mode" : "Edit Marker Positions"}
                                        >
                                            {editMode ? <Save size={16} /> : <Edit3 size={16} />}
                                            {editMode ? 'Done Editing' : 'Edit Positions'}
                                        </button>
                                        <button className={styles.controlBtn} onClick={toggleFullscreen} title="Toggle Fullscreen">
                                            {isFullscreen ? <ExternalLink size={16} /> : <ExternalLink size={16} />}
                                            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                                        </button>
                                    </div>

                                    {showTour && (
                                        <GuidedTour
                                            markers={markerPositions}
                                            currentIndex={tourIndex}
                                            isPlaying={tourPlaying}
                                            onPlay={() => setTourPlaying(true)}
                                            onPause={stopTour}
                                            onNext={nextTourConcept}
                                            onPrev={prevTourConcept}
                                            onClose={closeTour}
                                            onSelectConcept={selectTourConcept}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className={styles.streetViewCard}>
                                    <div className={styles.mapIcon}>
                                        <MapPin size={32} />
                                    </div>
                                    <h2>{routeBuilding?.name}</h2>
                                    <p>{routeBuilding?.visualTheme}</p>
                                    {loadError && <p className={styles.errorText}>{loadError}</p>}
                                    <button className={styles.openMapsButton} onClick={handleOpenStreetView}>
                                        <ExternalLink size={16} />
                                        Open in Street View
                                    </button>
                                </div>
                            )}

                    {showProgress && <ProgressPanel />}

                    {(() => {
                        const activeMarker = showTooltip && activeConcept && !showTour
                            ? markerPositions.find(m => m.conceptId === activeConcept)
                            : null;

                        if (!activeMarker) return null;

                        // Adapt PlacedConcept to LearningConcept format for CinematicView
                        const adaptedConcept: any = {
                            id: activeMarker.conceptId,
                            name: activeMarker.conceptName,
                            mnemonic: activeMarker.mnemonic,
                            lifecycle: {
                                phase1: { steps: activeMarker.lifecycle.phase1 },
                                phase2: { steps: activeMarker.lifecycle.phase2 },
                                phase3: { steps: activeMarker.lifecycle.phase3 },
                            }
                        };

                        return (
                            <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>
                                <CinematicView
                                    concept={adaptedConcept}
                                    onClose={() => setShowTooltip(false)}
                                />
                            </div>
                        );
                    })()}
                </div>

                {/* Placement Panel */}
                <aside className={styles.placementPanel}>
                    <div className={styles.placementHeader}>
                        <MapPin size={16} />
                        <h2>Placement Map</h2>
                        {currentPalace?.lifecycleLabels && (
                            <span className={styles.lifecycleVerbs}>
                                {currentPalace.lifecycleLabels.phase1} → {currentPalace.lifecycleLabels.phase2} → {currentPalace.lifecycleLabels.phase3}
                            </span>
                        )}
                    </div>

                    <div className={styles.placementList}>
                        {currentBuilding?.concepts.map(concept => {
                            const slot = routeBuilding?.placements.find(p => p.id === concept.slotId);
                            return (
                                <LifecycleCard
                                    key={concept.conceptId}
                                    concept={concept}
                                    slot={slot}
                                    lifecycleLabels={currentPalace?.lifecycleLabels}
                                />
                            );
                        })}

                        {(!currentBuilding?.concepts || currentBuilding.concepts.length === 0) && (
                            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
                                No concepts placed in this building yet.
                            </p>
                        )}
                    </div>
                </aside>
            </div>

            {/* Footer */}
            <footer className={styles.footer}>
                <button
                    className={styles.footerButton}
                    onClick={() => setShowQuiz(true)}
                >
                    <Target size={16} />
                    Quiz Mode
                </button>
                {streetViewEnabled && markerPositions.length > 0 && (
                    <button
                        className={styles.footerButton}
                        onClick={startTour}
                    >
                        <Navigation size={16} />
                        Guided Tour
                    </button>
                )}
                <button
                    className={styles.footerButton}
                    onClick={handleStartWalk}
                >
                    <Footprints size={16} />
                    Daily Walk
                </button>
                <button
                    className={styles.footerButton}
                    onClick={() => setShowProgress(!showProgress)}
                >
                    <BarChart3 size={16} />
                    {showProgress ? 'Hide Progress' : 'Progress'}
                </button>
            </footer>
        </div>
    );
}
