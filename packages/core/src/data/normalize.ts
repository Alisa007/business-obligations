import notes from "../../data/local-notes.json";
import uiSource from "../../data/ui-source.json";
import verification from "../../data/verification.json";
import { describeTrigger } from "../trigger";
import type { CountyJurisdiction, LocalJurisdiction, StateInfo } from "./types";

/** A state file as stored: the file name is the state code, and withholding is implied by the withholding page. */
export type StoredState = Omit<
  StateInfo,
  "code" | "unemployment" | "workersComp" | "verification"
> & {
  unemployment: Omit<StateInfo["unemployment"], "year">;
  workersComp: Omit<StateInfo["workersComp"], "threshold"> & { threshold?: string };
  verification: Omit<StateInfo["verification"], "scope" | "dba"> & { scope?: string };
};

/** Completes a stored state file with fields that are not duplicated in the source data. */
export function state(code: string, raw: unknown): StateInfo {
  const s = raw as StoredState;
  return {
    code,
    ...s,
    wageWithholding: s.wageWithholding,
    unemployment: { ...s.unemployment, year: uiSource.year },
    workersComp: {
      ...s.workersComp,
      threshold: s.workersComp.threshold ?? describeTrigger(s.workersComp.trigger) ?? "Varies",
    },
    verification: {
      ...s.verification,
      scope: s.verification.scope ?? verification.scope,
      dba: s.verification.unconfirmed.includes("dbaFiling") ? "unconfirmed" : "checked",
    },
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
