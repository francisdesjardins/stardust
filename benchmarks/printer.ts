import type { JsonEntry, JsonReport } from './types.ts';

export function formatCv(entry: JsonEntry): string {
  if (entry.samples < 2) {
    return '\x1b[2m  —\x1b[0m';
  }
  const cv = (entry.stddevOps / entry.opsPerSec) * 100;
  const str = `±${cv.toFixed(1)}%`;
  if (cv <= 3) {
    return `\x1b[32m✨ ${str}\x1b[0m`; // green — stable
  }
  if (cv <= 10) {
    return `\x1b[33m🌊 ${str}\x1b[0m`; // yellow — moderate
  }
  return `\x1b[31m🌪️  ${str}\x1b[0m`; // red — noisy
}

export function formatNsCompact(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)} ms`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)} µs`;
  }
  return `${String(n)} ns`;
}

export function printStability(report: JsonReport): void {
  console.log(`\n  🔬 Stability across ${String(report.runs)} runs\n`);
  console.log(
    `    ${'Benchmark'.padEnd(50)} ${'ops/s'.padStart(12)}  ${'ns/op'.padStart(10)}  ${'min'.padStart(12)}  ${'max'.padStart(12)}  ${'CV'.padStart(10)}`
  );
  console.log(
    `    ${'─'.repeat(50)} ${'─'.repeat(12)}  ${'─'.repeat(10)}  ${'─'.repeat(12)}  ${'─'.repeat(12)}  ${'─'.repeat(10)}`
  );

  for (const entry of report.entries) {
    console.log(
      `    ${entry.label.padEnd(50)} ${entry.opsPerSec.toLocaleString().padStart(12)}  ${formatNsCompact(entry.nsPerOp).padStart(10)}  ${entry.minOps.toLocaleString().padStart(12)}  ${entry.maxOps.toLocaleString().padStart(12)}  ${formatCv(entry).padStart(10 + 9)}`
    );
  }

  console.log('');
}
