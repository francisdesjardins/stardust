/**
 * Fresh stable benchmark — deletes history, runs 10 independent rounds,
 * and produces a clean baseline with stability stats.
 *
 * Usage:
 *   npm run bench:stable
 *
 * Each of the 10 runs is a full benchmark pass (warmup + measured rounds).
 * History is cleared first so the rolling median starts from scratch.
 * The final report reflects only this session's 10 runs.
 */

import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

import { HISTORY_PATH, LATEST_PATH } from './history.ts';

const RUNS = 10;

// ── Clean slate ─────────────────────────────────────────────────────────────

console.log('\n  🧹 Clearing benchmark history…');

if (existsSync(HISTORY_PATH)) {
  rmSync(HISTORY_PATH);
}
if (existsSync(LATEST_PATH)) {
  rmSync(LATEST_PATH);
}
console.log('  ✅ History cleared.\n');

// ── Run N independent passes ────────────────────────────────────────────────

const benchCmd = 'cross-env NODE_OPTIONS=--expose-gc npx tsx benchmarks/run.ts --rounds 5';
const cwd = resolve(import.meta.dirname, '..');

for (let i = 1; i <= RUNS; i++) {
  console.log(`\n  🏎️  Run ${String(i)}/${String(RUNS)}\n`);
  execSync(benchCmd, { cwd, stdio: 'inherit' });
}

// ── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n  🎯 Fresh stable baseline complete — ${String(RUNS)} independent runs.`);
console.log(`  📊 History: ${HISTORY_PATH}`);
console.log(`  💾 Median:  ${LATEST_PATH}`);
console.log('');
