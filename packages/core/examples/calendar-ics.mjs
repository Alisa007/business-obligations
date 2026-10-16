// Export a year of deadlines to an .ics file you can import into any calendar.  node examples/calendar-ics.mjs
import { writeFileSync } from "node:fs";
import { buildCalendar, toICS } from "business-obligations";

const { events } = buildCalendar(
  {
    entityType: "c_corp",
    zip: "10001",
    city: "New York",
    county: "New York",
    formationDate: "2023-05-01",
    employeeCount: 5,
    annualPayroll: 400_000,
  },
  { from: "2026-10-13", to: "2027-10-12" },
);

writeFileSync("deadlines.ics", toICS(events, { calendarName: "Acme Inc. compliance" }));
console.log(`Wrote ${events.length} events to deadlines.ics`);
