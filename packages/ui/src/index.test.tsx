import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultConfig } from "@tamagui/config/v6";
import { TamaguiProvider, createTamagui } from "tamagui";
import { planLaunch, type BusinessProfile } from "business-obligations";
import { filterObligations, LaunchList, ObligationsList, type ObligationFilters } from "./index";

const profile: BusinessProfile = {
  entityType: "llc",
  zip: "60601",
  city: "Chicago",
  county: "Cook",
  industry: "restaurant",
  employeeCount: 3,
  sellsTaxableGoods: true,
};

const filters = (overrides: Partial<ObligationFilters> = {}): ObligationFilters => ({
  jurisdiction: "all",
  category: "all",
  query: "",
  trust: "all",
  ...overrides,
});

const tamaguiConfig = createTamagui(defaultConfig);

describe("business-obligations-ui", () => {
  const plan = planLaunch(profile, { startDate: "2026-11-02", openingDate: "2027-02-01" });
  const items = plan.result.items;

  it("filters by jurisdiction, search text, and confidence", () => {
    const federal = filterObligations(items, filters({ jurisdiction: "federal" }));
    expect(federal.length).toBeGreaterThan(0);
    expect(federal.every((item) => item.jurisdiction === "federal")).toBe(true);

    const searched = filterObligations(items, filters({ query: "ein" }));
    expect(searched.some((item) => item.title.toLowerCase().includes("ein"))).toBe(true);

    const verified = filterObligations(items, filters({ trust: "verified" }));
    expect(
      verified.every((item) => item.provenance?.confidence === "checked" && !item.provenance.stale),
    ).toBe(true);
  });

  it("filters by category and combines category with search", () => {
    const item = items[0];
    if (!item) throw new Error("expected launch fixture to contain an obligation");

    const categoryItems = filterObligations(items, filters({ category: item.category }));
    expect(categoryItems.length).toBeGreaterThan(0);
    expect(categoryItems.every((candidate) => candidate.category === item.category)).toBe(true);

    const combined = filterObligations(
      items,
      filters({ category: item.category, query: item.title.slice(0, 4) }),
    );
    expect(combined.length).toBeGreaterThan(0);
    expect(combined.every((candidate) => candidate.category === item.category)).toBe(true);
    expect(combined.some((candidate) => candidate.id === item.id)).toBe(true);
  });

  it("renders the launch list with stats and accessible step controls", () => {
    const html = renderToStaticMarkup(
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <LaunchList plan={plan} costs={plan.costs} />
      </TamaguiProvider>,
    );
    expect(html).toContain("File formation");
    expect(html).toContain("Known fees");
    expect(html).toContain('type="checkbox"');
  });

  it("renders the obligation context, text deadlines, and category counts", () => {
    const item = items[0];
    if (!item) throw new Error("expected launch fixture to contain an obligation");
    const withTextDeadline = {
      ...item,
      id: `${item.id}-text-deadline`,
      title: `${item.title} text deadline`,
      nextDue: undefined,
      deadline: "Before opening",
    };
    const html = renderToStaticMarkup(
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <ObligationsList
          items={[withTextDeadline, ...items]}
          asOf="2026-11-02"
          filters={filters({ query: "text deadline" })}
          onFilters={() => undefined}
        />
      </TamaguiProvider>,
    );
    expect(html).toContain("Find an obligation");
    expect(html).toContain("Showing 1 of");
    expect(html).toContain("Category");
    expect(html).toContain("Data confidence");
    expect(html).toContain("All");
    expect(html).toContain("Federal");
    expect(html).toContain("State");
    expect(html).toContain("Before opening");
    expect(html).toContain("Clear filters");
    expect(html).toContain('href="https://');
    expect(html).not.toContain("text-align:center");
  });
});
