import { useRef, useEffect, useCallback } from 'react';
import styles from './SensaAnimLogo.module.css';

type LogoSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

interface SensaAnimLogoProps {
  size?: LogoSize;
  className?: string;
}

const SIZE_MAP: Record<LogoSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
  '2xl': styles.size2xl,
  '3xl': styles.size3xl,
  '4xl': styles.size4xl,
};

const MIN_DELAY = 4000;
const MAX_DELAY = 12000;

function randomDelay() {
  return MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
}

export function SensaAnimLogo({ size = 'md', className = '' }: SensaAnimLogoProps) {
  const classNames = [styles.logoWrapper, SIZE_MAP[size], className].filter(Boolean).join(' ');
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const schedulePlay = useCallback(() => {
    timerRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    }, randomDelay());
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => schedulePlay();

    video.addEventListener('ended', handleEnded);
    video.play().catch(() => {});

    return () => {
      video.removeEventListener('ended', handleEnded);
      clearTimeout(timerRef.current);
    };
  }, [schedulePlay]);

  return (
    <div className={classNames} role="img" aria-label="SensaAI logo">
      <video
        ref={videoRef}
        className={styles.logoVideo}
        src="/assets/SensaAnimLogo.mp4"
        muted
        playsInline
      />
    </div>
  );
}
