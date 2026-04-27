export type Bench = (group: string, label: string, iterations: number, fn: () => void) => void;
