import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    HelpCircle,
    Map
} from 'lucide-react';
import { usePalaceStore } from '@/store/palace-store';
import { getRouteById } from '@/constants/palace-routes';
import { MindPalaceContainer } from './FloorPlanView';
import ExteriorView from './ExteriorView/ExteriorView';
import { PlacementGuide } from './PlacementGuide';
import styles from './PalaceView.module.css';

export default function PalaceView() {
    const navigate = useNavigate();
    const { currentPalace, currentBuildingIndex, setCurrentBuilding, customRoutes } = usePalaceStore();
    const [showGuide, setShowGuide] = useState(false);

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

    const route = getRouteById(currentPalace.routeId) || customRoutes.find(r => r.id === currentPalace.routeId);
    if (!route) return null;

    const currentBuilding = currentPalace.buildings[currentBuildingIndex];
    const routeBuilding = route.buildings.find(b => b.id === currentBuilding?.routeBuildingId);

    const canGoPrev = currentBuildingIndex > 0;
    const canGoNext = currentBuildingIndex < currentPalace.buildings.length - 1;

    return (
        <div className={styles.palaceContainer} style={{ background: '#0f0f1a' }}> {/* Override background for darker theme */}

            {/* Header - Global Navigation */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <button className={styles.backButton} onClick={() => navigate(-1)}>
                        <ArrowLeft size={16} />
                        Back
                    </button>

                    <div className={styles.buildingIndicators}>
                        {currentPalace.buildings.map((_, idx) => (
                            <button
                                key={idx}
                                className={`${styles.indicator} ${idx === currentBuildingIndex ? styles.indicatorActive : ''}`}
                                onClick={() => setCurrentBuilding(idx)}
                                title={`Building ${idx + 1}`}
                            />
                        ))}
                    </div>
                </div>

                <div className={styles.buildingNav}>
                    <button
                        className={styles.navButton}
                        onClick={() => setCurrentBuilding(currentBuildingIndex - 1)}
                        disabled={!canGoPrev}
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className={styles.buildingTitle}>
                        <h1>{routeBuilding?.name || `Building ${currentBuildingIndex + 1}`}</h1>
                        <p>{currentBuilding?.stageName}</p>
                    </div>

                    <button
                        className={styles.navButton}
                        onClick={() => setCurrentBuilding(currentBuildingIndex + 1)}
                        disabled={!canGoNext}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <button
                    className={styles.helpButton}
                    onClick={() => setShowGuide(true)}
                    title="How to use Memory Palace"
                >
                    <HelpCircle size={20} />
                </button>
            </header>

            {/* Main Content Area - Swappable Views */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <MindPalaceContainer
                    // Pass currentPalace floorPlan if it exists (Phase 2 feature)
                    floorPlan={currentPalace.floorPlan}
                    // Pass ALL concepts from ALL buildings for Floor Plan and Graph views
                    concepts={currentPalace.buildings.flatMap(b => 
                        b.concepts.map(c => ({
                            id: c.conceptId,
                            name: c.conceptName,
                            stageId: b.stageId,
                            mnemonic: c.mnemonic,
                            order: 1,
                            icon: 'shape:nebula',
                            metaphor: c.conceptName,
                            hookSentence: '',
                            whyYouNeed: '',
                            realWorldExample: '',
                            howToUse: [],
                            technicalDetails: '',
                            prerequisites: [],
                            visualElement: c.conceptId,
                            actionButtonText: 'Learn',
                            lifecycle: c.lifecycle ? {
                                phase1: { title: 'Phase 1', steps: c.lifecycle.phase1 },
                                phase2: { title: 'Phase 2', steps: c.lifecycle.phase2 },
                                phase3: { title: 'Phase 3', steps: c.lifecycle.phase3 },
                            } : undefined,
                        }))
                    ) as any}
                    dependencyGraph={currentPalace.dependencyGraph}
                    exteriorView={<ExteriorView />}
                    onConceptSelect={(id) => console.log('Selected concept:', id)}
                    initialMode={currentPalace.viewMode || 'exterior'}
                />
            </div>

            {/* Placement Guide Overlay - kept global */}
            <PlacementGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
        </div>
    );
}
