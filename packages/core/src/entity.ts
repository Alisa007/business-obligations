import type { ResolvedProfile } from "./types";

/** Entities that register with the state (as opposed to sole proprietorships and general partnerships). */
export const isSeparateEntity = (p: ResolvedProfile): boolean =>
  p.entityType !== "sole_proprietorship" && p.entityType !== "partnership";

/** Entities that follow the state's LLC reporting rules (LLC, PLLC, LP, LLP). */
export const isLlcLike = (p: ResolvedProfile): boolean =>
  p.entityType === "llc" || p.entityType === "pllc" || p.entityType === "lp" || p.entityType === "llp";

/** Entities that follow the state's corporate reporting rules. */
export const isCorpLike = (p: ResolvedProfile): boolean => isSeparateEntity(p) && !isLlcLike(p);

export const isProfessionalEntity = (p: ResolvedProfile): boolean =>
  p.entityType === "pllc" || p.entityType === "pc" || p.entityType === "llp";

export const isLlcSubtype = (p: ResolvedProfile): boolean =>
  p.entityType === "llc" || p.entityType === "pllc";

export const isUnincorporated = (p: ResolvedProfile): boolean =>
  p.taxTreatment === "sole_prop" || p.taxTreatment === "partnership";
