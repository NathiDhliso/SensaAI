import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { SensaShape } from '@/components/ui';
import styles from './NotFound.module.css';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.shapeWrapper}>
                    <SensaShape type="nebula" size="xl" animate={true} />
                </div>
                <p className={styles.code}>404</p>
                <h1 className={styles.title}>Page Not Found</h1>
                <p className={styles.message}>
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <button onClick={() => navigate('/')} className={styles.homeButton}>
                    <Home size={18} />
                    Go Home
                </button>
            </div>
        </div>
    );
}
