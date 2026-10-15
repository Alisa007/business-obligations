import { describe, expect, it } from "vitest";
import { getComplianceItems, STATE_CODES } from "../src";

// A fixed, fully-loaded profile per state. Snapshots make any data or rule change visible in review.
describe.each(STATE_CODES)("snapshot %s", (code) => {
  it("llc with employees, sales and a trade name", () => {
    const items = getComplianceItems(
      {
        entityType: "llc",
        zip: "00000",
        state: code,
        city: "Sampletown",
        county: "Sample",
        employeeCount: 6,
        annualPayroll: 300_000,
        sellsTaxableGoods: true,
        usesTradeName: true,
        annualRevenue: 600_000,
        annualNetIncome: 120_000,
        formationDate: "2022-03-10",
      },
      { asOf: "2026-10-12" },
    );
    expect(
      items.map((i) => ({
        id: i.id,
        title: i.title,
        authority: i.authority,
        frequency: i.frequency,
        deadline: i.deadline,
        nextDue: i.nextDue,
      })),
    ).toMatchSnapshot();
  });

  it("c corp formed in the state with no employees", () => {
    const items = getComplianceItems(
      {
        entityType: "c_corp",
        zip: "00000",
        state: code,
        city: "Sampletown",
        county: "Sample",
        formationDate: "2022-03-10",
      },
      { asOf: "2026-10-12" },
    );
    expect(
      items.map((i) => `${i.id} | ${i.title} | ${i.deadline ?? ""} | ${i.nextDue ?? ""}`),
    ).toMatchSnapshot();
  });
});
