import type { BenchSample } from './types.ts';

/**
 * Dead-code elimination sink.
 *
 * V8's Turbofan can optimize away computations whose results are never
 * observed. Writing to a module-scoped variable that is later exported
 * forces V8 to actually execute the computation.
 *
 * Benchmark functions should call `sink(result)` for any return value
 * that would otherwise be discarded.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional opaque sink
export let __sink: any;

/**
 * Consume a value to prevent dead-code elimination.
 * Call this inside benchmark functions for any return value that would
 * otherwise be discarded (e.g. `sink(store.getSnapshot())`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional opaque sink
export function sink(value: any): void {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- opaque sink
  __sink = value;
}

/**
 * Minimum wall-clock duration (ms) for a single timed measurement.
 * If the benchmark finishes faster, iterations are auto-scaled upward
 * so that timer resolution noise becomes negligible. 200 ms gives
 * enough samples to average out CPU frequency fluctuations and
 * OS scheduler interrupts on sub-50 ns operations.
 */
const MIN_DURATION_MS = 200;

/**
 * Run a single timed measurement.
 *
 * - Forces a full GC before timing (if `--expose-gc` is active)
 * - Uses `process.hrtime.bigint()` for nanosecond precision
 * - Auto-scales iterations upward if the measurement would be too
 *   short for the timer to resolve accurately
 *
 * Returns the actual iteration count used (may exceed `minIterations`
 * if auto-scaling kicked in).
 */
export function runOnce(
  minIterations: number,
  fn: () => void
): BenchSample & { actualIterations: number } {
  // Force GC before measurement to prevent collection landing inside the timed window
  if (global.gc) {
    global.gc();
  }

  // Probe: run the requested iterations and check if we need more
  let iterations = minIterations;
  let start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  let elapsedNs = Number(process.hrtime.bigint() - start);
  let elapsedMs = elapsedNs / 1_000_000;

  // Auto-scale: if too fast, extrapolate how many iterations we need
  // for MIN_DURATION_MS and re-run with the larger count
  if (elapsedMs < MIN_DURATION_MS && elapsedMs > 0) {
    const scale = Math.ceil(MIN_DURATION_MS / elapsedMs);
    iterations = minIterations * scale;

    // Re-run with scaled iterations (GC again to reset heap)
    if (global.gc) {
      global.gc();
    }
    start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      fn();
    }
    elapsedNs = Number(process.hrtime.bigint() - start);
    elapsedMs = elapsedNs / 1_000_000;
  }

  return {
    opsPerSec: Math.round((iterations / elapsedMs) * 1_000),
    nsPerOp: Math.round(elapsedNs / iterations),
    actualIterations: iterations,
  };
}

export function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function stddev(arr: number[]): number {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
  return Math.round(Math.sqrt(variance));
}
