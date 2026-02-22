/**
 * Audio Manager - Singleton for managing background music and voice narration
 * 
 * Features:
 * - Background music with loop and volume control
 * - Voice narration queue with sequential playback
 * - Preloading for smooth playback
 * - User preference respect (mute, volume)
 */
import { logger } from '@/shared/utils/logger';
// Primer audio files path
const PRIMER_AUDIO_BASE = '/Audio/Primer';
// Audio file definitions
export const PRIMER_AUDIO = {
 // Narrations
 breathe: `${PRIMER_AUDIO_BASE}/breathe.mp3`,
 reason: `${PRIMER_AUDIO_BASE}/Reason.mp3`,
 action: `${PRIMER_AUDIO_BASE}/action.mp3`,
 reward: `${PRIMER_AUDIO_BASE}/reward.mp3`,
 ready: `${PRIMER_AUDIO_BASE}/ready.mp3`,
 // Background music
 ambientStudy: `${PRIMER_AUDIO_BASE}/ambient-study.mp3`,
 ambientStudy2: `${PRIMER_AUDIO_BASE}/ambient-study2.mp3`
} as const;
import { STORAGE_KEYS } from '@/shared/constants/storage-keys';
export type PrimerAudioKey = keyof typeof PRIMER_AUDIO;
export type AudioPriority = 'background' | 'narration' | 'effect' | 'interrupt';
interface QueuedAudio {
 src: string;
 priority: AudioPriority;
 volume?: number;
 loop?: boolean;
}
const PRIORITY_RANK: Record<AudioPriority, number> = {
 background: 0,
 narration: 1,
 effect: 2,
 interrupt: 3
};
class AudioManager {
 private static instance: AudioManager;
 private backgroundMusic: HTMLAudioElement | null = null;
 private narration: HTMLAudioElement | null = null;
 private activeEffect: HTMLAudioElement | null = null;
 private isMuted: boolean = false;
 private musicVolume: number = 0.3;
 private narrationVolume: number = 0.8;
 private isBackgroundMusicEnabled: boolean = true;
 private isNarrationEnabled: boolean = true;
 private audioCache: Map<string, HTMLAudioElement> = new Map();
 private queue: QueuedAudio[] = [];
 private currentPriority: AudioPriority = 'background';
 private constructor() {
 // Load preferences from localStorage
 this.loadPreferences();
 }
 static getInstance(): AudioManager {
 if (!AudioManager.instance) {
 AudioManager.instance = new AudioManager();
 }
 return AudioManager.instance;
 }
 /**
 * Load user preferences from localStorage
 */
 private loadPreferences(): void {
 try {
 const prefs = localStorage.getItem(STORAGE_KEYS.AUDIO_PREFERENCES);
 if (prefs) {
 const parsed = JSON.parse(prefs);
 this.isMuted = parsed.isMuted ?? false;
 this.musicVolume = parsed.musicVolume ?? 0.3;
 this.narrationVolume = parsed.narrationVolume ?? 0.8;
 this.isBackgroundMusicEnabled = parsed.isBackgroundMusicEnabled ?? true;
 this.isNarrationEnabled = parsed.isNarrationEnabled ?? true;
 }
 } catch {
 // Use defaults
 }
 }
 /**
 * Save preferences to localStorage
 */
 private savePreferences(): void {
 localStorage.setItem(STORAGE_KEYS.AUDIO_PREFERENCES, JSON.stringify({
 isMuted: this.isMuted,
 musicVolume: this.musicVolume,
 narrationVolume: this.narrationVolume,
 isBackgroundMusicEnabled: this.isBackgroundMusicEnabled,
 isNarrationEnabled: this.isNarrationEnabled
 }));
 }
 /**
 * Preload audio files for smooth playback
 */
 async preloadPrimerAudio(): Promise<void> {
 const audioFiles = Object.values(PRIMER_AUDIO);
 await Promise.allSettled(
 audioFiles.map(src => this.preloadAudio(src))
 );
 }
 /**
 * Preload a single audio file
 */
 private async preloadAudio(src: string): Promise<HTMLAudioElement> {
 if (this.audioCache.has(src)) {
 return this.audioCache.get(src)!;
 }
 return new Promise((resolve, reject) => {
 const audio = new Audio(src);
 audio.preload = 'auto';
 audio.addEventListener('canplaythrough', () => {
 this.audioCache.set(src, audio);
 resolve(audio);
 }, { once: true });
 audio.addEventListener('error', () => {
 logger.warn(`Failed to preload audio: ${src}`);
 reject(new Error(`Failed to load ${src}`));
 }, { once: true });
 // Start loading
 audio.load();
 });
 }
 /**
 * Play background music
 */
 async playBackgroundMusic(key: 'ambientStudy' | 'ambientStudy2' = 'ambientStudy'): Promise<void> {
 if (!this.isBackgroundMusicEnabled || this.isMuted) return;
 // Stop current music if playing
 this.stopBackgroundMusic();
 const src = PRIMER_AUDIO[key];
 try {
 let audio = this.audioCache.get(src);
 if (!audio) {
 audio = await this.preloadAudio(src);
 }
 this.backgroundMusic = audio.cloneNode(true) as HTMLAudioElement;
 this.backgroundMusic.loop = true;
 this.backgroundMusic.volume = this.musicVolume;
 await this.backgroundMusic.play();
 } catch (error) {
 logger.warn('Failed to play background music:', error);
 }
 }
 /**
 * Stop background music
 */
 stopBackgroundMusic(): void {
 if (this.backgroundMusic) {
 this.backgroundMusic.pause();
 this.backgroundMusic.currentTime = 0;
 this.backgroundMusic = null;
 }
 }
 /**
 * Fade out background music
 */
 fadeOutBackgroundMusic(duration: number = 2000): Promise<void> {
 return new Promise((resolve) => {
 if (!this.backgroundMusic) {
 resolve();
 return;
 }
 const startVolume = this.backgroundMusic.volume;
 const steps = 20;
 const stepDuration = duration / steps;
 const volumeStep = startVolume / steps;
 let step = 0;
 const interval = setInterval(() => {
 step++;
 if (this.backgroundMusic) {
 this.backgroundMusic.volume = Math.max(0, startVolume - (volumeStep * step));
 }
 if (step >= steps) {
 clearInterval(interval);
 this.stopBackgroundMusic();
 resolve();
 }
 }, stepDuration);
 });
 }
 /**
 * Play voice narration
 */
 async playNarration(key: Exclude<PrimerAudioKey, 'ambientStudy' | 'ambientStudy2'>): Promise<void> {
 if (!this.isNarrationEnabled || this.isMuted) return;
 // Stop current narration if playing
 this.stopNarration();
 const src = PRIMER_AUDIO[key];
 try {
 let audio = this.audioCache.get(src);
 if (!audio) {
 audio = await this.preloadAudio(src);
 }
 this.narration = audio.cloneNode(true) as HTMLAudioElement;
 this.narration.volume = this.narrationVolume;
 // Lower background music during narration
 if (this.backgroundMusic) {
 this.backgroundMusic.volume = this.musicVolume * 0.3;
 }
 await this.narration.play();
 // Wait for narration to finish
 return new Promise((resolve) => {
 this.narration?.addEventListener('ended', () => {
 // Restore background music volume
 if (this.backgroundMusic) {
 this.backgroundMusic.volume = this.musicVolume;
 }
 resolve();
 }, { once: true });
 });
 } catch (error) {
 logger.warn('Failed to play narration:', error);
 }
 }
 /**
 * Stop voice narration
 */
 stopNarration(): void {
 if (this.narration) {
 this.narration.pause();
 this.narration.currentTime = 0;
 this.narration = null;
 }
 // Restore background music volume
 if (this.backgroundMusic) {
 this.backgroundMusic.volume = this.musicVolume;
 }
 }
 /**
 * Stop all audio
 */
 stopAll(): void {
 this.stopBackgroundMusic();
 this.stopNarration();
 }
 // === Preference Setters ===
 setMuted(muted: boolean): void {
 this.isMuted = muted;
 if (muted) {
 this.stopAll();
 }
 this.savePreferences();
 }
 setMusicVolume(volume: number): void {
 this.musicVolume = Math.max(0, Math.min(1, volume));
 if (this.backgroundMusic) {
 this.backgroundMusic.volume = this.musicVolume;
 }
 this.savePreferences();
 }
 setNarrationVolume(volume: number): void {
 this.narrationVolume = Math.max(0, Math.min(1, volume));
 this.savePreferences();
 }
 setBackgroundMusicEnabled(enabled: boolean): void {
 this.isBackgroundMusicEnabled = enabled;
 if (!enabled) {
 this.stopBackgroundMusic();
 }
 this.savePreferences();
 }
 setNarrationEnabled(enabled: boolean): void {
 this.isNarrationEnabled = enabled;
 if (!enabled) {
 this.stopNarration();
 }
 this.savePreferences();
 }
 // === Track-based playback (UI sounds: mastery, success, etc.) ===
 play(track: string, src?: string): Promise<void> {
 if (this.isMuted) return Promise.resolve();
 if (src && !this.audioCache.has(src)) {
 const audio = new Audio(src);
 audio.preload = 'auto';
 this.audioCache.set(src, audio);
 }
 const audio = src ? this.audioCache.get(src) : this.audioCache.get(track);
 if (!audio) return Promise.resolve();
 audio.currentTime = 0;
 audio.volume = this.narrationVolume;
 return audio.play().catch((error) => {
 if (error.name !== 'NotAllowedError') {
 logger.error('[AudioManager] Playback error:', error);
 }
 });
 }
 stopCurrent(fade: boolean = false): Promise<void> {
 if (fade) return this.fadeOutAll(500);
 this.stopAll();
 return Promise.resolve();
 }
 async playWithPriority(src: string, priority: AudioPriority, options?: { volume?: number; loop?: boolean }): Promise<void> {
 if (this.isMuted) return;
 const rank = PRIORITY_RANK[priority];
 const currentRank = PRIORITY_RANK[this.currentPriority];
 if (rank < currentRank && this.activeEffect) {
 this.queue.push({ src, priority, ...options });
 return;
 }
 if (rank >= currentRank && this.activeEffect) {
 await this.fadeOutEffect(300);
 }
 if (priority === 'interrupt' && this.narration) {
 const savedVolume = this.backgroundMusic?.volume ?? this.musicVolume;
 if (this.backgroundMusic) this.backgroundMusic.volume = savedVolume * 0.2;
 }
 let audio = this.audioCache.get(src);
 if (!audio) {
 audio = new Audio(src);
 audio.preload = 'auto';
 this.audioCache.set(src, audio);
 }
 const el = audio.cloneNode(true) as HTMLAudioElement;
 el.volume = options?.volume ?? (priority === 'background' ? this.musicVolume : this.narrationVolume);
 el.loop = options?.loop ?? false;
 this.activeEffect = el;
 this.currentPriority = priority;
 el.addEventListener('ended', () => {
 if (this.activeEffect === el) {
 this.activeEffect = null;
 this.currentPriority = 'background';
 if (this.backgroundMusic) this.backgroundMusic.volume = this.musicVolume;
 this.processQueue();
 }
 }, { once: true });
 try {
 await el.play();
 } catch (error: unknown) {
 const err = error as { name?: string };
 if (err.name !== 'NotAllowedError') {
 logger.error('[AudioManager] Priority playback error:', error);
 }
 this.activeEffect = null;
 this.currentPriority = 'background';
 this.processQueue();
 }
 }
 private processQueue(): void {
 if (this.queue.length === 0) return;
 this.queue.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
 const next = this.queue.shift()!;
 this.playWithPriority(next.src, next.priority, { volume: next.volume, loop: next.loop });
 }
 private fadeOutEffect(duration: number): Promise<void> {
 return new Promise((resolve) => {
 if (!this.activeEffect) { resolve(); return; }
 const el = this.activeEffect;
 const startVol = el.volume;
 const steps = 10;
 const stepDur = duration / steps;
 const volStep = startVol / steps;
 let step = 0;
 const interval = setInterval(() => {
 step++;
 el.volume = Math.max(0, startVol - volStep * step);
 if (step >= steps) {
 clearInterval(interval);
 el.pause();
 el.currentTime = 0;
 if (this.activeEffect === el) this.activeEffect = null;
 resolve();
 }
 }, stepDur);
 });
 }
 private fadeOutAll(duration: number): Promise<void> {
 const promises: Promise<void>[] = [];
 if (this.activeEffect) promises.push(this.fadeOutEffect(duration));
 if (this.backgroundMusic) promises.push(this.fadeOutBackgroundMusic(duration));
 if (this.narration) {
 promises.push(new Promise((resolve) => {
 this.stopNarration();
 resolve();
 }));
 }
 return Promise.all(promises).then(() => {});
 }
 clearQueue(): void {
 this.queue = [];
 }
 // === Getters ===
 getMuted(): boolean {
 return this.isMuted;
 }
 getMusicVolume(): number {
 return this.musicVolume;
 }
 getNarrationVolume(): number {
 return this.narrationVolume;
 }
 getBackgroundMusicEnabled(): boolean {
 return this.isBackgroundMusicEnabled;
 }
 getNarrationEnabled(): boolean {
 return this.isNarrationEnabled;
 }
}
export const audioManager = AudioManager.getInstance();
export const AudioService = audioManager;
export function useAudioManager() {
 return audioManager;
}
if (typeof window !== 'undefined') {
 const initOnInteraction = () => {
 audioManager.preloadPrimerAudio().catch(() => {});
 document.removeEventListener('click', initOnInteraction);
 document.removeEventListener('keydown', initOnInteraction);
 };
 document.addEventListener('click', initOnInteraction, { once: true });
 document.addEventListener('keydown', initOnInteraction, { once: true });
}
