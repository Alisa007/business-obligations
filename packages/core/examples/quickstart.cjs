// The same thing from CommonJS, no TypeScript or build step needed.  node examples/quickstart.cjs
const { evaluate, validateProfile, InvalidProfileError } = require("business-obligations");

const profile = {
  entityType: "llc",
  zip: "78701",
  city: "Austin",
  county: "Travis",
  employeeCount: 2,
  annualPayroll: 90000,
};

// Optional: check the shape first. Typos are reported with a suggestion.
const problems = validateProfile(profile);
if (problems.length) {
  for (const p of problems) console.error(`${p.field}: ${p.message}`);
  process.exit(1);
}

try {
  const { items } = evaluate(profile);
  console.log(`${items.length} obligations; first three:`);
  for (const item of items.slice(0, 3)) console.log(`- ${item.title} (${item.authority})`);
} catch (error) {
  if (error instanceof InvalidProfileError) console.error(error.message);
  else throw error;
}
