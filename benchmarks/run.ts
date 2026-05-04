/**
 * Stardust benchmark runner — powered by mitata.
 *
 * Usage:
 *   npx tsx benchmarks/run.ts
 *
 * Results are written to benchmarks/results/latest.json and consumed by
 * the playground Lab tab via vite-plugin-bench.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, platform, totalmem } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { run } from 'mitata';
import { getBenchGroups } from './mitata.ts';

// Side-effect imports — each file registers its benchmarks with mitata.
import './definitions/index.ts';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const RESULTS_DIR = resolve(__dirname, 'results');
const LATEST_PATH = resolve(RESULTS_DIR, 'latest.json');

function stddev(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length);
}

const { context, benchmarks } = await run({ colors: true });
const groups = getBenchGroups();

type BenchEntry = {
  group: string;
  label: string;
  opsPerSec: number;
  nsPerOp: number;
  iterations: number;
  samples: number;
  stddevOps: number;
  minOps: number;
  maxOps: number;
};

const entries: BenchEntry[] = [];

for (const trial of benchmarks) {
  const firstRun = trial.runs[0];
  if (!firstRun?.stats) {
    continue;
  }
  const { stats } = firstRun;
  const opsValues = stats.samples.map((s) => 1e9 / s);
  entries.push({
    group: groups.get(trial.alias) ?? '',
    label: trial.alias,
    opsPerSec: Math.round(1e9 / stats.avg),
    nsPerOp: Math.round(stats.avg),
    iterations: stats.ticks,
    samples: stats.samples.length,
    stddevOps: Math.round(stddev(opsValues)),
    minOps: Math.round(1e9 / stats.min),
    maxOps: Math.round(1e9 / stats.max),
  });
}

const cpu = context.cpu.name ?? cpus()[0]?.model ?? 'unknown';

const report = {
  entries,
  runs: 1,
  rounds: 1,
  date: new Date().toISOString(),
  node: process.version,
  platform: `${platform()} ${process.arch}`,
  cpu,
  cores: cpus().length,
  ramGb: Math.round(totalmem() / 1e9),
};

mkdirSync(RESULTS_DIR, { recursive: true });
writeFileSync(LATEST_PATH, JSON.stringify(report, null, 2));
console.log(`\n  💾 Results written to ${LATEST_PATH}`);
