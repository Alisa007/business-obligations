// What does a small Austin LLC with two employees need?  node examples/quickstart.mjs
import { evaluate } from "compliance-rules-engine";

const { items } = evaluate({
  entityType: "llc",
  zip: "78701",
  city: "Austin",
  county: "Travis",
  employeeCount: 2,
  annualPayroll: 90_000,
});

for (const item of items) {
  console.log(`[${item.jurisdiction}] ${item.title}`);
  console.log(`    ${item.authority}${item.nextDue ? ` — next due ${item.nextDue}` : ""}`);
}
