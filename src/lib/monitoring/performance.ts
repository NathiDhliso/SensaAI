/**
 * Simple Performance Monitoring for Client-Side Operations
 */

type MetricType = 'repair_success' | 'repair_failure' | 'generation_time' | 'repair_time';

interface MetricEvent {
    type: MetricType;
    value: number; // Duration in ms or 1/0 for success/fail
    tags?: Record<string, string>;
    timestamp: number;
}

class PerformanceMonitor {
    private metrics: MetricEvent[] = [];

    public track(type: MetricType, value: number, tags: Record<string, string> = {}) {
        const event: MetricEvent = {
            type,
            value,
            tags,
            timestamp: Date.now()
        };
        this.metrics.push(event);

        // In prod, this would send to Analytics/CloudWatch
        if (import.meta.env.DEV) {
            console.log(`[PerfMonitor] ${type}: ${value}`, tags);
        }
    }

    public getAverage(type: MetricType): number {
        const relevant = this.metrics.filter(m => m.type === type);
        if (relevant.length === 0) return 0;
        return relevant.reduce((acc, curr) => acc + curr.value, 0) / relevant.length;
    }

    public getMetrics() {
        return this.metrics;
    }
}

export const performanceMonitor = new PerformanceMonitor();
