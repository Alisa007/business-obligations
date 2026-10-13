import { diffItems, evaluate, resolveProfile, type EvaluateOptions, type ItemDiff } from "./engine";
import type { BusinessProfile, ComplianceItem, EntityType, MultiStateActivity } from "./types";

/** Something that happens to a business and changes its obligations. */
export type LifecycleEvent =
  /** Hire employees at the home location. */
  | { type: "hire"; count: number; annualPayroll?: number }
  /** Add members or partners. */
  | { type: "add_owners"; count: number }
  /** Cross a revenue level. */
  | { type: "revenue"; annualRevenue: number; annualNetIncome?: number }
  /** Start selling taxable goods. */
  | { type: "start_selling_goods" }
  /** Start operating from commercial premises (instead of home). */
  | { type: "leave_home_office" }
  /** Convert to a different entity type. */
  | { type: "convert"; entityType: EntityType; formationDate?: string }
  /** Begin activity in another state: employees, property or sales. */
  | ({ type: "expand" } & MultiStateActivity)
  /** Move the principal place of business. The old formation state is kept unless `formationState` is given. */
  | { type: "relocate"; zip: string; city: string; county: string; state?: string; formationState?: string }
  /** Complete formation. */
  | { type: "form"; formationDate: string };

/** Returns the profile as it would be after the event. Does not mutate the input. */
export function applyEvent(profile: BusinessProfile, event: LifecycleEvent): BusinessProfile {
  switch (event.type) {
    case "hire":
      return {
        ...profile,
        employeeCount: (profile.employeeCount ?? 0) + event.count,
        ...(profile.fullTimeEmployeeCount !== undefined
          ? { fullTimeEmployeeCount: profile.fullTimeEmployeeCount + event.count }
          : {}),
        ...(event.annualPayroll !== undefined
          ? { annualPayroll: (profile.annualPayroll ?? 0) + event.annualPayroll }
          : {}),
      };
    case "add_owners":
      return { ...profile, ownerCount: (profile.ownerCount ?? 1) + event.count };
    case "revenue":
      return {
        ...profile,
        annualRevenue: event.annualRevenue,
        ...(event.annualNetIncome !== undefined ? { annualNetIncome: event.annualNetIncome } : {}),
      };
    case "start_selling_goods":
      return { ...profile, sellsTaxableGoods: true };
    case "leave_home_office":
      return { ...profile, homeBased: false };
    case "convert":
      return {
        ...profile,
        entityType: event.entityType,
        ...(event.formationDate ? { formationDate: event.formationDate } : {}),
      };
    case "expand": {
      const activity: MultiStateActivity = {
        state: event.state,
        employeeCount: event.employeeCount,
        hasProperty: event.hasProperty,
        salesUsd: event.salesUsd,
      };
      const others = (profile.multistate ?? []).filter((m) => m.state !== activity.state);
      return { ...profile, multistate: [...others, activity] };
    }
    case "relocate": {
      // Keep the original formation state: the entity does not re-form by moving.
      const formationState = event.formationState ?? resolveProfile(profile).formationState;
      return {
        ...profile,
        zip: event.zip,
        city: event.city,
        county: event.county,
        state: event.state,
        formationState,
      };
    }
    case "form":
      return { ...profile, isFormed: true, formationDate: event.formationDate };
  }
}

export interface Transition {
  event: LifecycleEvent;
  /** Obligations that begin because of the event. */
  added: ComplianceItem[];
  /** Obligations that no longer apply. */
  removed: ComplianceItem[];
  /** Obligations whose details change. */
  changed: ItemDiff[];
  /** Obligations that begin, ordered by the earliest known due date. */
  nextSteps: ComplianceItem[];
  /** The profile after the event. */
  profile: BusinessProfile;
}

/**
 * Explains what an event does to a business's obligations: what starts, what stops and what changes.
 * Pass a single event or a sequence applied in order.
 */
export function explainTransition(
  profile: BusinessProfile,
  event: LifecycleEvent | LifecycleEvent[],
  options: EvaluateOptions = {},
): Transition {
  const events = Array.isArray(event) ? event : [event];
  const after = events.reduce(applyEvent, profile);
  const before = evaluate(profile, options);
  const next = evaluate(after, options);
  const diff = diffItems(before.items, next.items);
  const nextSteps = [...diff.added].sort((a, b) => (a.nextDue ?? "9999").localeCompare(b.nextDue ?? "9999"));
  return {
    event: events.length === 1 ? events[0]! : (events as unknown as LifecycleEvent),
    ...diff,
    nextSteps,
    profile: after,
  };
}
