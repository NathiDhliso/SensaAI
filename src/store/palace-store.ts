import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MemoryPalace, PalaceProgress, PlacedConcept, PalaceBuilding, PalaceRoute, RouteBuilding } from '@/lib/types/palace';
import type { MnemonicContext } from '@/lib/types/learning';
import { getRouteById } from '@/constants/palace-routes';
import { capturePanorama } from '@/lib/panorama';

interface PlacementOverride {
    headingOffset: number;
    pitch: number;
}

interface PanoramaMarker {
    yaw: number;
    pitch: number;
}

interface PalaceState {
    // Current palace
    currentPalace: MemoryPalace | null;
    currentBuildingIndex: number;

    // Custom routes created by user
    customRoutes: PalaceRoute[];

    // Placement position overrides: palaceId -> buildingId -> slotId -> override
    placementOverrides: Record<string, Record<string, Record<string, PlacementOverride>>>;

    // Panorama marker positions: palaceId -> buildingId -> conceptId -> marker
    panoramaMarkers: Record<string, Record<string, Record<string, PanoramaMarker>>>;

    // Progress
    progress: Record<string, PalaceProgress>; // palaceId -> progress

    // Actions
    createPalace: (subjectId: string, routeId: string, stages: StageData[], lifecycleLabels?: { phase1: string; phase2: string; phase3: string }) => MemoryPalace;
    createCustomPalace: (subjectId: string, routeName: string, customBuildings: RouteBuilding[], stages: StageData[], lifecycleLabels?: { phase1: string; phase2: string; phase3: string }) => MemoryPalace;
    saveCustomRoute: (routeName: string, buildings: RouteBuilding[]) => PalaceRoute;
    setCurrentBuilding: (index: number) => void;
    loadPalace: () => void;
    clearPalace: () => void;

    // Quiz actions
    recordAnswer: (conceptId: string, correct: boolean) => void;
    updateStreak: () => void;

    // Placement editing
    updatePlacementPosition: (buildingId: string, slotId: string, headingOffset: number, pitch: number) => void;
    getPlacementOverride: (buildingId: string, slotId: string) => PlacementOverride | null;

    // Panorama marker editing
    updatePanoramaMarker: (buildingId: string, conceptId: string, yaw: number, pitch: number) => void;
    getPanoramaMarkers: (buildingId: string) => Record<string, PanoramaMarker>;
}

interface StageData {
    id: string;
    name: string;
    concepts: ConceptData[];
}

interface ConceptData {
    id: string;
    name: string;
    lifecycle: {
        phase1: string[];
        phase2: string[];
        phase3: string[];
    };
    /** Memory Palace mnemonic context for tier-based rendering */
    mnemonic?: MnemonicContext;
}

export const usePalaceStore = create<PalaceState>()(
    persist(
        (set, get) => ({
            currentPalace: null,
            currentBuildingIndex: 0,
            customRoutes: [],
            placementOverrides: {},
            panoramaMarkers: {},
            progress: {},

            createPalace: (subjectId, routeId, stages, lifecycleLabels) => {
                const route = getRouteById(routeId);
                if (!route) throw new Error(`Route ${routeId} not found`);

                const palaceId = `${subjectId}-${routeId}-${Date.now()}`;

                // Map stages to buildings (up to 7 stages)
                const buildings: PalaceBuilding[] = stages.slice(0, 7).map((stage, idx) => {
                    const routeBuilding = route.buildings[idx];

                    // Distribute concepts across placement slots
                    const concepts: PlacedConcept[] = stage.concepts.slice(0, 6).map((concept, cIdx) => ({
                        conceptId: concept.id,
                        conceptName: concept.name,
                        slotId: routeBuilding.placements[cIdx]?.id || `slot-${cIdx}`,
                        lifecycle: concept.lifecycle,
                        mastery: 0,
                    }));

                    return {
                        routeBuildingId: routeBuilding.id,
                        stageId: stage.id,
                        stageName: stage.name,
                        concepts,
                    };
                });

                const palace: MemoryPalace = {
                    id: palaceId,
                    subjectId,
                    routeId,
                    buildings,
                    createdAt: new Date().toISOString(),
                    lifecycleLabels,
                };

                // Initialize progress
                const newProgress: PalaceProgress = {
                    palaceId,
                    buildingProgress: {},
                    conceptMastery: {},
                    streak: 0,
                    lastWalkDate: null,
                };

                set(state => ({
                    currentPalace: palace,
                    currentBuildingIndex: 0,
                    progress: { ...state.progress, [palaceId]: newProgress },
                }));

                // Note: Pre-built routes use live Street View (Google tile server blocks CORS)
                // Panorama capture only works for custom routes where user confirms in StreetViewPreview

                return palace;
            },

            createCustomPalace: (subjectId, routeName, customBuildings, stages, lifecycleLabels) => {
                const routeId = `custom-${Date.now()}`;
                const palaceId = `${subjectId}-${routeId}`;

                // Map stages to custom buildings
                const buildings: PalaceBuilding[] = stages.slice(0, customBuildings.length).map((stage, idx) => {
                    const routeBuilding = customBuildings[idx];

                    // Distribute concepts across placement slots
                    const concepts: PlacedConcept[] = stage.concepts.slice(0, 6).map((concept, cIdx) => ({
                        conceptId: concept.id,
                        conceptName: concept.name,
                        slotId: routeBuilding.placements[cIdx]?.id || `slot-${cIdx}`,
                        lifecycle: concept.lifecycle,
                        mastery: 0,
                        mnemonic: concept.mnemonic, // Pass mnemonic for tier-based rendering
                    }));

                    return {
                        routeBuildingId: routeBuilding.id,
                        stageId: stage.id,
                        stageName: stage.name,
                        concepts,
                    };
                });

                const palace: MemoryPalace = {
                    id: palaceId,
                    subjectId,
                    routeId,
                    buildings,
                    createdAt: new Date().toISOString(),
                    lifecycleLabels,
                };

                // Initialize progress
                const newProgress: PalaceProgress = {
                    palaceId,
                    buildingProgress: {},
                    conceptMastery: {},
                    streak: 0,
                    lastWalkDate: null,
                };

                // Save custom route for future use
                const customRoute: PalaceRoute = {
                    id: routeId,
                    name: routeName,
                    description: `Custom route: ${routeName}`,
                    buildings: customBuildings,
                };

                set(state => ({
                    currentPalace: palace,
                    currentBuildingIndex: 0,
                    customRoutes: [...state.customRoutes, customRoute],
                    progress: { ...state.progress, [palaceId]: newProgress },
                }));

                customBuildings.forEach(building => {
                    if (building.panoId) {
                        capturePanorama(
                            building.panoId,
                            palaceId,
                            building.id,
                            building.coordinates
                        ).catch(err => console.error('Failed to capture panorama:', err));
                    }
                });

                return palace;
            },

            saveCustomRoute: (routeName, buildings) => {
                const routeId = `custom-${Date.now()}`;
                const customRoute: PalaceRoute = {
                    id: routeId,
                    name: routeName,
                    description: `Custom route: ${routeName}`,
                    buildings,
                };

                set(state => ({
                    customRoutes: [...state.customRoutes, customRoute],
                }));

                return customRoute;
            },

            setCurrentBuilding: (index) => {
                const palace = get().currentPalace;
                if (!palace) return;
                const maxIndex = palace.buildings.length - 1;
                set({ currentBuildingIndex: Math.max(0, Math.min(index, maxIndex)) });
            },

            loadPalace: () => {
                set({ currentBuildingIndex: 0 });
            },

            clearPalace: () => {
                set({ currentPalace: null, currentBuildingIndex: 0 });
            },

            recordAnswer: (conceptId, correct) => {
                const palace = get().currentPalace;
                if (!palace) return;

                set(state => {
                    const progress = state.progress[palace.id];
                    if (!progress) return state;

                    const existing = progress.conceptMastery[conceptId] || {
                        seen: 0,
                        correct: 0,
                        mastery: 0,
                        nextReview: new Date().toISOString(),
                    };

                    const newMastery = correct
                        ? existing.mastery + (1 - existing.mastery) * 0.2
                        : existing.mastery * 0.8;

                    const nextReviewDays = Math.ceil(newMastery * 7);
                    const nextReview = new Date();
                    nextReview.setDate(nextReview.getDate() + nextReviewDays);

                    return {
                        progress: {
                            ...state.progress,
                            [palace.id]: {
                                ...progress,
                                conceptMastery: {
                                    ...progress.conceptMastery,
                                    [conceptId]: {
                                        seen: existing.seen + 1,
                                        correct: existing.correct + (correct ? 1 : 0),
                                        mastery: newMastery,
                                        nextReview: nextReview.toISOString(),
                                    },
                                },
                            },
                        },
                    };
                });
            },

            updateStreak: () => {
                const palace = get().currentPalace;
                if (!palace) return;

                const today = new Date().toDateString();

                set(state => {
                    const progress = state.progress[palace.id];
                    if (!progress) return state;

                    const lastWalk = progress.lastWalkDate
                        ? new Date(progress.lastWalkDate).toDateString()
                        : null;

                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);

                    let newStreak = progress.streak;
                    if (lastWalk === yesterday.toDateString()) {
                        newStreak += 1;
                    } else if (lastWalk !== today) {
                        newStreak = 1;
                    }

                    return {
                        progress: {
                            ...state.progress,
                            [palace.id]: {
                                ...progress,
                                streak: newStreak,
                                lastWalkDate: today,
                            },
                        },
                    };
                });
            },

            updatePlacementPosition: (buildingId, slotId, headingOffset, pitch) => {
                const palace = get().currentPalace;
                if (!palace) return;

                set(state => {
                    const palaceOverrides = state.placementOverrides[palace.id] || {};
                    const buildingOverrides = palaceOverrides[buildingId] || {};
                    
                    return {
                        placementOverrides: {
                            ...state.placementOverrides,
                            [palace.id]: {
                                ...palaceOverrides,
                                [buildingId]: {
                                    ...buildingOverrides,
                                    [slotId]: { headingOffset, pitch },
                                },
                            },
                        },
                    };
                });
            },

            getPlacementOverride: (buildingId, slotId) => {
                const state = get();
                const palace = state.currentPalace;
                if (!palace) return null;

                const palaceOverrides = state.placementOverrides[palace.id];
                if (!palaceOverrides) return null;

                const buildingOverrides = palaceOverrides[buildingId];
                if (!buildingOverrides) return null;

                return buildingOverrides[slotId] || null;
            },

            updatePanoramaMarker: (buildingId, conceptId, yaw, pitch) => {
                const palace = get().currentPalace;
                if (!palace) return;

                set(state => {
                    const palaceMarkers = state.panoramaMarkers[palace.id] || {};
                    const buildingMarkers = palaceMarkers[buildingId] || {};
                    
                    return {
                        panoramaMarkers: {
                            ...state.panoramaMarkers,
                            [palace.id]: {
                                ...palaceMarkers,
                                [buildingId]: {
                                    ...buildingMarkers,
                                    [conceptId]: { yaw, pitch },
                                },
                            },
                        },
                    };
                });
            },

            getPanoramaMarkers: (buildingId) => {
                const state = get();
                const palace = state.currentPalace;
                if (!palace) return {};

                const palaceMarkers = state.panoramaMarkers[palace.id];
                if (!palaceMarkers) return {};

                return palaceMarkers[buildingId] || {};
            },
        }),
        {
            name: 'sensa-palace-storage',
        }
    )
);
