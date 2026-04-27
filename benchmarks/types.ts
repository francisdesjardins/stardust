export type BenchSample = {
  opsPerSec: number;
  nsPerOp: number;
};

export type BenchResult = {
  label: string;
  group: string;
  iterations: number;
  samples: BenchSample[];
  median: BenchSample;
  min: BenchSample;
  max: BenchSample;
  stddev: number;
};

export type BenchDef = {
  label: string;
  group: string;
  iterations: number;
  fn: () => void;
};

export type JsonEntry = {
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

export type JsonReport = {
  date: string;
  rounds: number;
  node: string;
  platform: string;
  cpu: string;
  cores: number;
  ramGb: string;
  runs: number;
  entries: JsonEntry[];
};

export type HistoryRun = {
  date: string;
  rounds: number;
  entries: JsonEntry[];
};

export type History = {
  node: string;
  platform: string;
  cpu: string;
  cores: number;
  ramGb: string;
  runs: HistoryRun[];
};
