import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs));
}
export function formatTime(seconds: number): string {
 const mins = Math.floor(seconds / 60);
 const secs = Math.floor(seconds % 60);
 return `${mins}:${secs.toString().padStart(2, '0')}`;
}
export function formatDuration(seconds: number): string {
 const mins = Math.floor(seconds / 60);
 const secs = seconds % 60;
 if (mins >= 60) {
 const hrs = Math.floor(mins / 60);
 const remainMins = mins % 60;
 return `${hrs}h ${remainMins}m`;
 }
 return `${mins}:${secs.toString().padStart(2, '0')}`;
}
export function formatPace(seconds: number): string {
 if (seconds === 0) return '--:--';
 const mins = Math.floor(seconds / 60);
 const secs = seconds % 60;
 return `${mins}:${secs.toString().padStart(2, '0')}`;
}
export function formatSafeDate(dateString: string | number | undefined | null): string {
 if (!dateString) return 'Unknown';
 let date: Date;
 if (typeof dateString === 'number') {
 date = new Date(dateString);
 } else if (/^\d+$/.test(dateString)) {
 date = new Date(Number(dateString));
 } else {
 date = new Date(dateString);
 }
 if (isNaN(date.getTime())) return 'Unknown';
 return date.toLocaleDateString();
}
export type TimerUrgency = 'normal' | 'warning' | 'critical';
export function getTimerUrgency(
 remaining: number,
 warningThreshold: number,
 criticalThreshold: number
): TimerUrgency {
 if (remaining <= criticalThreshold) return 'critical';
 if (remaining <= warningThreshold) return 'warning';
 return 'normal';
}