/// <reference types="vite/client" />

declare module '*.tsx?raw' {
  const content: string;
  export default content;
}

declare module '*.ts?raw' {
  const content: string;
  export default content;
}

declare module 'virtual:bench-results' {
  export type BenchEntry = {
    label: string;
    group: string;
    iterations: number;
    opsPerSec: number;
    nsPerOp: number;
    minOps: number;
    maxOps: number;
    stddevOps: number;
    samples: number;
  };

  export type BenchReport = {
    date: string;
    rounds: number;
    node: string;
    platform: string;
    cpu: string;
    cores: number;
    ramGb: string;
    runs: number;
    entries: BenchEntry[];
  };

  const report: BenchReport;
  export default report;
}

declare module 'virtual:bench-source/*' {
  const source: string;
  export default source;
}
