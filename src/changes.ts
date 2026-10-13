import changeData from "../data/changes.json";
import type { ChangeNotice, RuleChange, StateInfo } from "./data/types";

export type { RuleChange, ChangeNotice, ChangeKind } from "./data/types";

const REGISTRY = changeData as unknown as { rulesetVersion: string; changes: RuleChange[] };

/**
 * Version of the bundled rules and data. Bumped whenever any rule or data file changes; the format is
 * `YYYY.MM.DD-n` (date of the data review, then a revision counter).
 */
export const RULESET_VERSION: string = REGISTRY.rulesetVersion;

/** Dated changes bundled with the library, sorted by effective date. */
export const BUNDLED_CHANGES: readonly RuleChange[] = [...REGISTRY.changes].sort((a, b) =>
  a.effective.localeCompare(b.effective),
);

export interface ChangeFilter {
  state?: string;
  /** Only changes effective on or after this date. */
  from?: string;
  /** Only changes effective on or before this date. */
  to?: string;
  status?: RuleChange["status"];
}

/** Lists bundled rule changes, optionally filtered. */
export function listChanges(filter: ChangeFilter = {}, extra: readonly RuleChange[] = []): RuleChange[] {
  return [...BUNDLED_CHANGES, ...extra]
    .filter(
      (c) =>
        (!filter.state || c.scope.state === filter.state) &&
        (!filter.from || c.effective >= filter.from) &&
        (!filter.to || c.effective <= filter.to) &&
        (!filter.status || c.status === filter.status),
    )
    .sort((a, b) => a.effective.localeCompare(b.effective));
}

export const toNotice = (c: RuleChange): ChangeNotice => ({
  id: c.id,
  effective: c.effective,
  status: c.status,
  kind: c.kind,
  summary: c.summary,
  ...(c.source ? { source: c.source } : {}),
});

/** Whether a change concerns an item (by state and rule-id prefix). */
export function changeMatchesItem(c: RuleChange, item: { id: string; state?: string }): boolean {
  if (c.scope.state && c.scope.state !== item.state) return false;
  if (
    c.scope.rules &&
    !c.scope.rules.some((r) => item.id === r || item.id.startsWith(r + ":") || item.id.startsWith(r + "#"))
  )
    return false;
  return true;
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let cur = target;
  for (const k of keys.slice(0, -1)) {
    const next = cur[k];
    if (typeof next !== "object" || next === null) cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]!] = value;
}

/** Evaluation context: the date and the set of changes in force for the current `evaluate` call. */
interface Context {
  asOf: string;
  changes: readonly RuleChange[];
  key: string;
}

let active: Context | null = null;
const cache = new Map<string, StateInfo>();

/** Runs `fn` with state data resolved as of `asOf`, applying enacted patches that have taken effect. */
export function withContext<T>(asOf: string, changes: readonly RuleChange[], fn: () => T): T {
  const prev = active;
  active = { asOf, changes, key: `${asOf}|${changes.map((c) => c.id).join(",")}` };
  try {
    return fn();
  } finally {
    active = prev;
  }
}

/** State data as of the active evaluation date (the bundled base data outside an evaluation). */
export function resolveState(code: string, base: StateInfo): StateInfo {
  if (!active) return base;
  const applicable = active.changes
    .filter(
      (c) =>
        c.status === "enacted" && c.patches?.length && c.scope.state === code && c.effective <= active!.asOf,
    )
    .sort((a, b) => a.effective.localeCompare(b.effective));
  if (applicable.length === 0) return base;
  const key = `${code}|${active.key}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const copy = structuredClone(base) as unknown as Record<string, unknown>;
  for (const c of applicable) for (const p of c.patches!) setPath(copy, p.path, p.value);
  if (cache.size > 500) cache.clear();
  cache.set(key, copy as unknown as StateInfo);
  return copy as unknown as StateInfo;
}
