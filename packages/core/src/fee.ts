import { statedPenalty, type FeeDetail, type Penalty } from "./data/types";

const money = (n: number) => `$${Number.isInteger(n) ? n.toLocaleString("en-US") : n.toFixed(2)}`;

/** The headline of a fee, from its numbers alone. */
function headline(fd: FeeDetail, limits: string[]): string {
  const { amount, online, paper, perUnit, freeUnits, min, max, rate } = fd;
  const unit = fd.basis === "per_member" ? "member" : "partner";
  switch (fd.basis) {
    case "none":
      return "Free";
    case "varies":
      return min !== undefined ? `From ${money(min)}` : "Varies";
    case "percent": {
      if (min !== undefined) limits.push(`minimum ${money(min)}`);
      return rate !== undefined ? `${rate}%` : "Varies";
    }
    case "tiered":
      return "Varies";
    case "unknown":
      return "Not yet confirmed";
    case "per_partner":
    case "per_member": {
      if (min !== undefined && min !== amount) limits.push(`minimum ${money(min)}`);
      if (max !== undefined) limits.push(`maximum ${money(max)}`);
      if (perUnit === undefined) return "Varies";
      if (amount === undefined) return `${money(perUnit)} per ${unit}`;
      if (freeUnits === undefined) return `${money(amount)} plus ${money(perUnit)} per ${unit}`;
      return `${money(amount)} base, plus ${money(perUnit)} per ${unit} over ${freeUnits}`;
    }
    case "flat": {
      if (fd.waived) return "Waived";
      if (amount === undefined) return "Varies";
      if (online !== undefined && paper !== undefined)
        return `${money(online)} online (${money(paper)} paper)`;
      if (online !== undefined) {
        if (online === amount) return `${money(amount)} online`;
        return online < amount
          ? `${money(amount)} (${money(online)} if filed online)`
          : `${money(amount)} (${money(online)} online)`;
      }
      if (paper !== undefined) return `${money(amount)} (${money(paper)} on paper)`;
      if (min !== undefined && min === amount) return `${money(amount)} minimum`;
      return money(amount);
    }
  }
}

/**
 * The display text of a fee, generated from its structured form: the numbers give the headline ("$30 online ($45
 * paper)", "$100 per partner (minimum $200, maximum $5,000)") and `note` adds the qualifier that numbers cannot carry
 * ("annual tax", "$0 for nonprofit corporations"). The fee is written once, in the data's `feeDetail`.
 */
export function describeFee(fd: FeeDetail): string {
  if (fd.basis === "tiered")
    return fd.tiers?.length
      ? fd.tiers.map((tier) => `${tier.label}: ${describeFee(tier)}`).join("; ")
      : "Varies";
  const limits: string[] = [];
  const head = headline(fd, limits);
  const range = limits.length ? [limits.join(", ")] : [];
  const extras =
    fd.basis === "percent" ? [fd.note, ...range] : [...range, fd.estimate ? "estimate" : undefined, fd.note];
  const parts = extras.filter((x): x is string => !!x);
  if (!parts.length) return head;
  // A headline that already ends in a parenthesis takes the extras inside it.
  return head.endsWith(")") ? `${head.slice(0, -1)}; ${parts.join("; ")})` : `${head} (${parts.join("; ")})`;
}

/** The `cost` of an item from a report or license; an unresearched fee gives none. */
export function feeCost(it: { feeDetail: FeeDetail }) {
  return it.feeDetail.basis === "unknown" ? {} : { cost: { ...it.feeDetail, currency: "USD" as const } };
}

/** The `penalty` of an item; one that is `none` or `unknown` gives none. */
export function penaltyOf(it: { penalty: Penalty }) {
  const late = statedPenalty(it.penalty);
  return late ? { penalty: { ...late, currency: "USD" as const } } : {};
}
