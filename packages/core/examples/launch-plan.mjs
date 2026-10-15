// An ordered plan for opening a restaurant LLC in Chicago.  node examples/launch-plan.mjs
import { planLaunch } from "compliance-rules-engine";

const plan = planLaunch(
  {
    entityType: "llc",
    zip: "60601",
    city: "Chicago",
    county: "Cook",
    industry: "restaurant",
    employeeCount: 6,
    annualPayroll: 240_000,
    sellsTaxableGoods: true,
  },
  { startDate: "2026-11-02", openingDate: "2027-03-01" },
);

console.log(
  `Ready to operate ${plan.readyDate} (${plan.onTrack ? "on track" : "too late"} for ${plan.openingDate})\n`,
);
for (const phase of plan.phases) {
  console.log(`${phase.title} (${phase.start}${phase.end ? ` -> ${phase.end}` : ""})`);
  for (const step of phase.steps) console.log(`  ${step.order}. ${step.item.title}`);
}
