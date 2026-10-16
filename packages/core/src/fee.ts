import type { FeeDetail } from "./data/types";

const money = (n: number) => `$${Number.isInteger(n) ? n.toLocaleString("en-US") : n.toFixed(2)}`;

/**
 * Display text for a fee that its structured form says completely, or undefined when it needs words of its own
 * (a waiver, an estimate, a rate, a note). The data stores `fee` text only for those; everything else is generated
 * from `feeDetail`, so the amount is written once.
 */
export function describeFee(fd: FeeDetail): string | undefined {
  if (fd.note || fd.waived || fd.estimate || fd.rate !== undefined || fd.base !== undefined) return undefined;
  const { amount, online, paper, perUnit, freeUnits, min, max } = fd;
  switch (fd.basis) {
    case "none":
      return amount === 0 && online === undefined && paper === undefined ? "Free" : undefined;
    case "flat":
      if (amount === undefined || perUnit !== undefined || freeUnits !== undefined) return undefined;
      if (min !== undefined || max !== undefined) return undefined;
      if (online !== undefined && paper !== undefined)
        return online === amount ? `${money(online)} online (${money(paper)} paper)` : undefined;
      if (paper !== undefined) return undefined;
      if (online !== undefined)
        return online < amount ? `${money(amount)} (${money(online)} if filed online)` : undefined;
      return money(amount);
    case "per_partner":
    case "per_member": {
      if (perUnit === undefined || online !== undefined || paper !== undefined) return undefined;
      const who = fd.basis === "per_partner" ? "partner" : "member";
      const limits = [
        min !== undefined && min !== amount ? `minimum ${money(min)}` : "",
        max !== undefined ? `maximum ${money(max)}` : "",
      ].filter(Boolean);
      const tail = limits.length ? ` (${limits.join(", ")})` : "";
      if (amount === undefined && freeUnits === undefined) return `${money(perUnit)} per ${who}${tail}`;
      if (amount !== undefined && freeUnits !== undefined)
        return `${money(amount)} base, plus ${money(perUnit)} per ${who} over ${freeUnits}${tail}`;
      return undefined;
    }
    default:
      return undefined;
  }
}

/** The fee text of a report or license: the stored text when there is one, else generated from `feeDetail`. */
export function feeText(it: { fee?: string; feeDetail?: FeeDetail }): string {
  return it.fee ?? (it.feeDetail ? describeFee(it.feeDetail) : undefined) ?? "Varies";
}

/**
 * The `cost` of an item from a report or license: `feeDetail` plus, when the data carries its own fee text, that
 * text as the note (it holds what the numbers cannot, such as a waiver).
 */
export function feeCost(it: { fee?: string; feeDetail?: FeeDetail }) {
  if (!it.feeDetail) return {};
  const note = it.feeDetail.note ?? it.fee;
  return { cost: { ...it.feeDetail, ...(note ? { note } : {}), currency: "USD" as const } };
}
