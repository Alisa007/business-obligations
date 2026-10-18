import type { ComplianceItem } from "business-obligations";

export const isVerified = (item: Pick<ComplianceItem, "provenance">) =>
  item.provenance?.confidence === "checked" && !item.provenance.stale;

export const isSoon = (value: string, asOf: string) => {
  const days = (Date.parse(`${value}T00:00:00Z`) - Date.parse(`${asOf}T00:00:00Z`)) / 86_400_000;
  return days >= 0 && days <= 30;
};
