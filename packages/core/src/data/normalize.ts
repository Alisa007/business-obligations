import notes from "../../data/local-notes.json";
import uiSource from "../../data/ui-source.json";
import type { CountyJurisdiction, LocalJurisdiction, StateInfo } from "./types";

/** A state file as stored: the file name is the state code, and withholding is implied by the withholding page. */
export type StoredState = Omit<StateInfo, "code" | "wageWithholding" | "unemployment"> & {
  unemployment: Omit<StateInfo["unemployment"], "year">;
};

/** Completes a stored state file with the fields that follow from other fields. */
export function state(code: string, raw: unknown): StateInfo {
  const s = raw as StoredState;
  return {
    code,
    ...s,
    wageWithholding: !!s.links.withholding,
    unemployment: { ...s.unemployment, year: uiSource.year },
  };
}

/** Completes the entries of a stored city or county file with the state named by the file and the shared note text. */
export function places<T extends LocalJurisdiction | CountyJurisdiction>(code: string, raw: unknown): T[] {
  return (raw as Array<Omit<T, "state">>).map((e) => {
    const reason = e.reason;
    if (reason !== undefined && !(reason in notes)) throw new Error(`Unknown reason "${reason}" in ${code}`);
    return { state: code, ...e, ...(reason ? { note: (notes as Record<string, string>)[reason] } : {}) } as T;
  });
}
