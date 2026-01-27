/**
 * Performance Measurement Utility
 *
 * Provides simple performance measurement for editor operations.
 * Disabled by default to avoid overhead in production.
 *
 * Usage:
 *   import { perf } from './utils/performance.js';
 *
 *   perf.enable(); // Turn on logging
 *
 *   perf.mark('selection-start');
 *   // ... do selection work ...
 *   perf.measure('click-selection', 'selection-start');
 *
 *   perf.getMetrics(); // Get all recorded measurements
 */

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    [name: string]: {
      count: number;
      min: number;
      max: number;
      avg: number;
      total: number;
    };
  };
}

class PerformanceUtil {
  private enabled = false;
  private marks = new Map<string, number>();
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;

  /**
   * Enable performance logging.
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable performance logging and clear data.
   */
  disable(): void {
    this.enabled = false;
    this.clear();
  }

  /**
   * Check if performance logging is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Clear all recorded metrics.
   */
  clear(): void {
    this.marks.clear();
    this.metrics = [];
  }

  /**
   * Mark a point in time.
   */
  mark(name: string): void {
    if (!this.enabled) return;
    this.marks.set(name, performance.now());
  }

  /**
   * Measure time since a mark.
   * Logs to console if enabled.
   */
  measure(name: string, startMark: string): number | null {
    if (!this.enabled) return null;

    const start = this.marks.get(startMark);
    if (start === undefined) {
      console.warn(`[perf] Unknown mark: ${startMark}`);
      return null;
    }

    const duration = performance.now() - start;
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // Trim old metrics if over limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log with target indicator
    const target = this.getTarget(name);
    const status = target ? (duration <= target ? '✓' : '✗') : '';
    console.log(`[perf] ${name}: ${duration.toFixed(2)}ms ${status}`);

    return duration;
  }

  /**
   * Time a function and return result.
   */
  time<T>(name: string, fn: () => T): T {
    if (!this.enabled) return fn();

    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });

    console.log(`[perf] ${name}: ${duration.toFixed(2)}ms`);
    return result;
  }

  /**
   * Time an async function and return result.
   */
  async timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) return fn();

    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });

    console.log(`[perf] ${name}: ${duration.toFixed(2)}ms`);
    return result;
  }

  /**
   * Get all recorded metrics.
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get performance report with summary statistics.
   */
  getReport(): PerformanceReport {
    const summary: PerformanceReport['summary'] = {};

    for (const metric of this.metrics) {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          count: 0,
          min: Infinity,
          max: -Infinity,
          avg: 0,
          total: 0,
        };
      }

      const s = summary[metric.name];
      s.count++;
      s.total += metric.duration;
      s.min = Math.min(s.min, metric.duration);
      s.max = Math.max(s.max, metric.duration);
      s.avg = s.total / s.count;
    }

    return {
      metrics: this.getMetrics(),
      summary,
    };
  }

  /**
   * Print a summary report to console.
   */
  printReport(): void {
    const report = this.getReport();
    console.log('\n[perf] Performance Summary:');
    console.log('─'.repeat(70));

    const entries = Object.entries(report.summary);
    if (entries.length === 0) {
      console.log('No metrics recorded.');
      return;
    }

    for (const [name, stats] of entries) {
      const target = this.getTarget(name);
      const status = target ? (stats.avg <= target ? '✓' : '✗') : '';
      console.log(
        `  ${name}: avg=${stats.avg.toFixed(2)}ms, ` +
          `min=${stats.min.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms, ` +
          `count=${stats.count} ${status}`
      );
    }

    console.log('─'.repeat(70));
  }

  /**
   * Get target time for a metric name.
   */
  private getTarget(name: string): number | null {
    // Performance targets from the proposal
    const targets: Record<string, number> = {
      'click-selection': 50,
      'marquee-selection': 50,
      'shift-click': 50,
      'editor-to-3d-sync': 200,
      '3d-to-editor-sync': 200,
      'full-reparse-small': 500,
      'full-reparse-medium': 500,
      'full-reparse-large': 500,
      'keyboard-navigation': 16,
      'search-filter': 50,
    };

    return targets[name] ?? null;
  }
}

// Singleton instance
export const perf = new PerformanceUtil();
