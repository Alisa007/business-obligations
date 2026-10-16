// What changes if the business hires, adds a partner, or opens in another state?  node examples/what-if.mjs
import { explainTransition } from "business-obligations";

const business = { entityType: "llc", zip: "78701", city: "Austin", county: "Travis" };

const hire = explainTransition(business, { type: "hire", count: 3, annualPayroll: 150_000 });
console.log("Hiring 3 people adds:");
for (const item of hire.nextSteps) console.log(`  - ${item.title}`);

const expand = explainTransition(business, { type: "expand", state: "CA", employeeCount: 1 });
console.log("\nOne employee in California adds:");
for (const item of expand.added.filter((i) => i.state === "CA")) console.log(`  - ${item.title}`);
