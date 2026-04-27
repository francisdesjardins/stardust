/**
 * Thin mitata wrapper that tracks which group each benchmark belongs to.
 * mitata's trial type doesn't expose group membership, so we capture it
 * at registration time via this wrapper.
 */
import * as m from 'mitata';

const benchGroups = new Map<string, string>();
let currentGroup = '';

export function group(name: string, fn: () => void): void {
  currentGroup = name;
  m.group(name, fn);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function bench(name: string, fn: any): m.B {
  benchGroups.set(name, currentGroup);
  return m.bench(name, fn);
}

export function getBenchGroups(): ReadonlyMap<string, string> {
  return benchGroups;
}

export { run, do_not_optimize } from 'mitata';
