/**
 * Vite plugin that runs the store benchmark and exposes results
 * as virtual modules:
 *
 * - `virtual:bench-results`              — latest benchmark report (median across runs)
 * - `virtual:bench-source/<filename>`    — raw source of a benchmark definition file
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { isNullish } from './src/shared/lib/is-nullish.ts';

const ROOT = resolve(import.meta.dirname, '..');
const RESULTS_DIR = resolve(ROOT, 'benchmarks', 'results');
const LATEST_PATH = resolve(RESULTS_DIR, 'latest.json');
const DEFINITIONS_DIR = resolve(ROOT, 'benchmarks', 'definitions');

const VIRTUAL_LATEST = 'virtual:bench-results';
const RESOLVED_LATEST = '\0' + VIRTUAL_LATEST;
const VIRTUAL_SOURCE_PREFIX = 'virtual:bench-source/';
const RESOLVED_SOURCE_PREFIX = '\0' + VIRTUAL_SOURCE_PREFIX;

function runBenchmark(): string {
  console.log('\n  [bench] Running store benchmark…');
  execSync('npx cross-env NODE_OPTIONS=--expose-gc npx tsx benchmarks/run.ts', {
    cwd: ROOT,
    stdio: 'inherit',
  });
  return readFileSync(LATEST_PATH, 'utf-8');
}

function loadCachedOrRun(): string {
  if (existsSync(LATEST_PATH)) {
    console.log('  [bench] Using cached benchmark results');
    return readFileSync(LATEST_PATH, 'utf-8');
  }
  return runBenchmark();
}

export function benchPlugin(): Plugin {
  let latestJson = '';
  const sourceCache = new Map<string, string>();

  return {
    name: 'vite-plugin-bench',
    buildStart() {
      latestJson = loadCachedOrRun();

      const files = readdirSync(DEFINITIONS_DIR).filter(
        (f) => f.endsWith('.ts') && f !== 'index.ts' && f !== 'types.ts'
      );
      for (const file of files) {
        const content = readFileSync(resolve(DEFINITIONS_DIR, file), 'utf-8');
        sourceCache.set(file, content);
      }
    },
    resolveId(id) {
      if (id === VIRTUAL_LATEST) {
        return RESOLVED_LATEST;
      }
      if (id.startsWith(VIRTUAL_SOURCE_PREFIX)) {
        return '\0' + id;
      }
      return undefined;
    },
    load(id) {
      if (id === RESOLVED_LATEST) {
        return `export default ${latestJson};`;
      }
      if (id.startsWith(RESOLVED_SOURCE_PREFIX)) {
        const filename = id.slice(RESOLVED_SOURCE_PREFIX.length);
        const content = sourceCache.get(filename);
        if (!isNullish(content)) {
          return `export default ${JSON.stringify(content)};`;
        }
      }
      return undefined;
    },
  };
}

export function getBenchDefinitionFiles(): string[] {
  const files = readdirSync(DEFINITIONS_DIR).filter(
    (f) => f.endsWith('.ts') && f !== 'index.ts' && f !== 'types.ts'
  );
  return files.map((f) => f.replace(/\.ts$/, ''));
}
