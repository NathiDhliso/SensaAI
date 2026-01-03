import { Footprints, Flame, Clock, Brain } from 'lucide-react';
import { usePalaceStore } from '@/store/palace-store';
import styles from './EnhancedFeatures.module.css';

interface DailyWalkProps {
    onStartWalk: (startBuildingIndex: number) => void;
}

export default function DailyWalk({ onStartWalk }: DailyWalkProps) {
    const { currentPalace, progress } = usePalaceStore();

    if (!currentPalace) return null;

    const palaceProgress = progress[currentPalace.id];
    const streak = palaceProgress?.streak || 0;

    const totalBuildings = currentPalace.buildings.length;
    const buildingsPerWalk = Math.min(3, totalBuildings);
    const today = new Date().getDay();
    const startBuilding = (today * buildingsPerWalk) % totalBuildings;
    const endBuilding = totalBuildings > 1
        ? (startBuilding + buildingsPerWalk - 1) % totalBuildings
        : 0;
    const displayStart = startBuilding + 1;
    const displayEnd = endBuilding >= startBuilding
        ? endBuilding + 1
        : totalBuildings;

    // Count concepts in these buildings
    const conceptCount = currentPalace.buildings
        .slice(startBuilding, endBuilding + 1)
        .reduce((sum, b) => sum + b.concepts.length, 0);

    const estimatedTime = Math.ceil(conceptCount * 0.7); // ~40 seconds per concept

    return (
        <div className={styles.dailyWalk}>
            <div className={styles.walkHeader}>
                <h3 className={styles.walkTitle}>
                    <Footprints size={20} />
                    Today's Walk
                </h3>
                {streak > 0 && (
                    <span className={styles.streak}>
                        <Flame size={16} />
                        {streak} day streak
                    </span>
                )}
            </div>

            <div className={styles.walkInfo}>
                <span className={styles.infoItem}>
                    <Clock size={14} />
                    ~{estimatedTime} min
                </span>
                <span className={styles.infoItem}>
                    <Brain size={14} />
                    {conceptCount} concepts
                </span>
            </div>

            <button className={styles.startWalkButton} onClick={() => onStartWalk(startBuilding)}>
                Start Walk (Buildings {displayStart} → {displayEnd})
            </button>
        </div>
    );
}
