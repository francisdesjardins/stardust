import { cpus, totalmem } from 'node:os';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

import type { BenchResult } from './types.ts';

export function writeReport(results: BenchResult[], rounds: number): string {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\.\d+Z$/, '');

  const lines: string[] = [];
  lines.push(`# Store Benchmark Report`);
  lines.push('');
  const cpu = cpus()[0];
  const ramGb = (totalmem() / 1024 ** 3).toFixed(1);

  lines.push(`- **Date**: ${now.toISOString()}`);
  lines.push(`- **Rounds**: ${String(rounds)}`);
  lines.push(`- **Node**: ${process.version}`);
  lines.push(`- **Platform**: ${process.platform} ${process.arch}`);
  lines.push(
    `- **CPU**: ${(cpu?.model ?? 'unknown').trim()} (${String(cpus().length)} cores, ${String(cpu?.speed ?? 0)} MHz)`
  );
  lines.push(`- **RAM**: ${ramGb} GB`);
  lines.push('');

  let currentGroup = '';

  for (const r of results) {
    if (r.group !== currentGroup) {
      currentGroup = r.group;
      lines.push(`## ${currentGroup}`);
      lines.push('');
      if (rounds > 1) {
        lines.push(
          '| Benchmark | Iterations | Median ops/s | Median ns/op | Min ops/s | Max ops/s | Stddev |'
        );
        lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
      } else {
        lines.push('| Benchmark | Iterations | ops/s | ns/op |');
        lines.push('| --- | ---: | ---: | ---: |');
      }
    }

    if (rounds > 1) {
      lines.push(
        `| ${r.label} | ${r.iterations.toLocaleString()} | ${r.median.opsPerSec.toLocaleString()} | ${r.median.nsPerOp.toLocaleString()} | ${r.min.opsPerSec.toLocaleString()} | ${r.max.opsPerSec.toLocaleString()} | ${r.stddev.toLocaleString()} |`
      );
    } else {
      lines.push(
        `| ${r.label} | ${r.iterations.toLocaleString()} | ${r.median.opsPerSec.toLocaleString()} | ${r.median.nsPerOp.toLocaleString()} |`
      );
    }
  }

  lines.push('');

  const content = lines.join('\n');
  const filename = `${timestamp}.md`;
  const filepath = resolve(import.meta.dirname, 'results', filename);

  writeFileSync(filepath, content, 'utf-8');
  return filepath;
}
