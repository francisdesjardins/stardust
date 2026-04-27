import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus, totalmem } from 'node:os';
import { resolve } from 'node:path';

import { median, stddev } from './runner.ts';
import type { BenchResult, History, JsonEntry, JsonReport } from './types.ts';

export const MAX_HISTORY = 10;

const RESULTS_DIR = resolve(import.meta.dirname, 'results');
export const HISTORY_PATH = resolve(RESULTS_DIR, 'history.json');
export const LATEST_PATH = resolve(RESULTS_DIR, 'latest.json');

function loadHistory(): History | undefined {
  if (!existsSync(HISTORY_PATH)) {
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(HISTORY_PATH, 'utf-8')) as History;
  } catch {
    return undefined;
  }
}

function sysInfo() {
  const cpu = cpus()[0];
  return {
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    cpu: (cpu?.model ?? 'unknown').trim(),
    cores: cpus().length,
    ramGb: (totalmem() / 1024 ** 3).toFixed(1),
  };
}

export function appendHistory(results: BenchResult[], rounds: number): History {
  const history = loadHistory() ?? { ...sysInfo(), runs: [] };

  // Update system info to current
  const sys = sysInfo();
  history.node = sys.node;
  history.platform = sys.platform;
  history.cpu = sys.cpu;
  history.cores = sys.cores;
  history.ramGb = sys.ramGb;

  // Append this run
  history.runs.push({
    date: new Date().toISOString(),
    rounds,
    entries: results.map((r) => ({
      label: r.label,
      group: r.group,
      iterations: r.iterations,
      opsPerSec: r.median.opsPerSec,
      nsPerOp: r.median.nsPerOp,
    })),
  });

  // Trim to last N
  if (history.runs.length > MAX_HISTORY) {
    history.runs = history.runs.slice(-MAX_HISTORY);
  }

  writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');
  return history;
}

export function computeMedianReport(history: History): JsonReport {
  // For each benchmark label, collect ops/s and ns/op across all runs and compute stats
  const allLabels: string[] = [];
  const allGroups = new Map<string, string>();
  const allIterations = new Map<string, number>();
  const opsMap = new Map<string, number[]>();
  const nsMap = new Map<string, number[]>();

  for (const run of history.runs) {
    for (const entry of run.entries) {
      if (!opsMap.has(entry.label)) {
        allLabels.push(entry.label);
        allGroups.set(entry.label, entry.group);
        allIterations.set(entry.label, entry.iterations);
        opsMap.set(entry.label, []);
        nsMap.set(entry.label, []);
      }
      opsMap.get(entry.label)!.push(entry.opsPerSec);
      nsMap.get(entry.label)!.push(entry.nsPerOp);
    }
  }

  const entries: JsonEntry[] = allLabels.map((label) => {
    const ops = opsMap.get(label)!;
    const ns = nsMap.get(label)!;
    return {
      label,
      group: allGroups.get(label)!,
      iterations: allIterations.get(label)!,
      opsPerSec: Math.round(median(ops)),
      nsPerOp: Math.round(median(ns)),
      minOps: Math.min(...ops),
      maxOps: Math.max(...ops),
      stddevOps: stddev(ops),
      samples: ops.length,
    };
  });

  return {
    date: new Date().toISOString(),
    rounds: history.runs.reduce((sum, r) => sum + r.rounds, 0),
    node: history.node,
    platform: history.platform,
    cpu: history.cpu,
    cores: history.cores,
    ramGb: history.ramGb,
    runs: history.runs.length,
    entries,
  };
}

export function writeLatest(report: JsonReport): void {
  writeFileSync(LATEST_PATH, JSON.stringify(report, null, 2), 'utf-8');
}
