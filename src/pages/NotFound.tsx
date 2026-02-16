import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { SensaAnimLogo } from '@/components/ui';
import styles from './NotFound.module.css';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.shapeWrapper}>
                    <SensaAnimLogo size="3xl" />
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
