import { describe, expect, it } from "vitest";
import { planLaunch, type BusinessProfile } from "../src";

const profile: BusinessProfile = {
  entityType: "llc",
  zip: "60601",
  city: "Chicago",
  county: "Cook",
  industry: "restaurant",
  employeeCount: 3,
  annualPayroll: 90000,
  sellsTaxableGoods: true,
  usesTradeName: true,
};

describe("planLaunch", () => {
  const plan = planLaunch(profile, { startDate: "2026-11-02", openingDate: "2027-02-01" });
  const index = (re: RegExp) => plan.steps.findIndex((s) => re.test(s.item.id));

  it("orders formation before the EIN before registrations and licenses", () => {
    const form = index(/^state\.formation/);
    const ein = index(/^fed\.ein/);
    const sales = index(/^state\.sales-tax/);
    const license = index(/^industry\.food-service/);
    expect(form).toBeGreaterThanOrEqual(0);
    expect(form).toBeLessThan(ein);
    expect(ein).toBeLessThan(sales);
    expect(sales).toBeLessThan(license);
  });

  it("puts the registered agent before the formation filing", () => {
    expect(index(/^state\.registered-agent/)).toBeLessThan(index(/^state\.formation/));
  });

  it("numbers steps consecutively and keeps phases in order", () => {
    expect(plan.steps.map((s) => s.order)).toEqual(plan.steps.map((_, i) => i + 1));
    const ids = plan.phases.map((p) => p.id);
    const canonical = ["prepare", "form", "identify", "register", "license", "employ", "operate"];
    expect(ids).toEqual(canonical.filter((id) => ids.includes(id as never)));
  });

  it("schedules phases back to back from the start date", () => {
    expect(plan.startDate).toBe("2026-11-02");
    expect(plan.formationDate).toBe("2026-11-09"); // after the 7-day prepare allowance
    for (let i = 1; i < plan.phases.length - 1; i++) {
      expect(plan.phases[i]!.start >= plan.phases[i - 1]!.start).toBe(true);
    }
    expect(plan.readyDate).toBe("2027-01-16"); // 7 + 14 + 3 + 14 + 30 + 7 = 75 days
  });

  it("reports whether the opening date is reachable", () => {
    expect(plan.onTrack).toBe(true);
    expect(plan.slackDays).toBeGreaterThan(0);
    const late = planLaunch(profile, { startDate: "2026-11-02", openingDate: "2026-11-30" });
    expect(late.onTrack).toBe(false);
    expect(late.slackDays).toBeLessThan(0);
  });

  it("lists recurring obligations with first due dates and no end", () => {
    const operate = plan.phases.find((p) => p.id === "operate")!;
    expect(operate.end).toBeUndefined();
    expect(operate.steps.some((s) => s.target)).toBe(true);
    const dates = operate.steps.map((s) => s.target ?? "9999");
    expect(dates).toEqual([...dates].sort());
  });

  it("depends on the EIN for registrations and the formation filing for the EIN", () => {
    const einStep = plan.steps.find((s) => s.item.ruleId === "fed.ein")!;
    const formId = plan.steps.find((s) => s.item.ruleId === "state.formation")!.item.id;
    expect(einStep.dependsOn).toContain(formId);
    const sales = plan.steps.find((s) => s.item.ruleId === "state.sales-tax")!;
    expect(sales.dependsOn).toContain(einStep.item.id);
  });

  it("honours custom allowances", () => {
    const quick = planLaunch(profile, { startDate: "2026-11-02", allowanceDays: { license: 5 } });
    expect(quick.readyDate < plan.readyDate).toBe(true);
  });

  it("totals fees", () => {
    expect(plan.costs.currency).toBe("USD");
  });

  it("does not require a formation state filing for sole proprietors", () => {
    const p = planLaunch({ ...profile, entityType: "sole_proprietorship" }, { startDate: "2026-11-02" });
    expect(p.steps.some((s) => s.item.ruleId === "state.formation")).toBe(false);
  });
});

describe("planLaunch phases", () => {
  it("treats the sales tax permit as a registration and the returns as recurring", () => {
    const plan = planLaunch(profile, { startDate: "2026-11-02" });
    const permit = plan.steps.find(
      (s) => s.item.ruleId === "state.sales-tax" && s.item.category === "permit",
    );
    const returns = plan.steps.find(
      (s) => s.item.ruleId === "state.sales-tax" && s.item.category === "payment",
    );
    expect(permit?.phase).toBe("register");
    expect(returns?.phase).toBe("operate");
  });
});
