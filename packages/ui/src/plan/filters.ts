import type { ComplianceItem } from "business-obligations";
import { isVerified } from "./items";

export const JURISDICTIONS = ["federal", "state", "county", "city"] as const;

export interface ObligationFilters {
  jurisdiction: string;
  category: string;
  query: string;
  trust: "all" | "verified" | "unverified";
}

export const NO_OBLIGATION_FILTERS: ObligationFilters = {
  jurisdiction: "all",
  category: "all",
  query: "",
  trust: "all",
};

/** Lower case without accents, so that "licencia" finds "Licencia" and "licéncia". */
const fold = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function itemMatches(item: ComplianceItem, filters: ObligationFilters) {
  const query = fold(filters.query.trim());
  return (
    (filters.jurisdiction === "all" || item.jurisdiction === filters.jurisdiction) &&
    (filters.category === "all" || item.category === filters.category) &&
    (filters.trust === "all" || (filters.trust === "verified") === isVerified(item)) &&
    (!query || fold(`${item.title} ${item.authority} ${item.description} ${item.reason}`).includes(query))
  );
}

export function filterObligations(items: ComplianceItem[], filters: ObligationFilters): ComplianceItem[] {
  return items.filter((item) => itemMatches(item, filters));
}
