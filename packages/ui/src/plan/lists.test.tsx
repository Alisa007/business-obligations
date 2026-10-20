import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultConfig } from "@tamagui/config/v6";
import { TamaguiProvider, createTamagui } from "tamagui";
import { localizePlan, planLaunch, type BusinessProfile } from "business-obligations";
import { es } from "business-obligations/locales/es";
import {
  ExternalLink,
  filterObligations,
  LaunchList,
  messages,
  ObligationsList,
  type ObligationFilters,
} from "../index";

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
  const render = (node: ReactElement) =>
    renderToStaticMarkup(
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        {node}
      </TamaguiProvider>,
    );

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

  it("hides jurisdiction filters with no items", () => {
    const stateItems = items.filter((item) => item.jurisdiction === "state");
    const html = render(
      <ObligationsList
        items={stateItems}
        asOf="2026-11-02"
        filters={filters()}
        onFilters={() => undefined}
      />,
    );
    expect(html).toContain("State");
    expect(html).not.toContain("City");
    expect(html).not.toContain("County");
  });

  it("shows items that apply only under conditions inside the group of their level, with what would bring them in", () => {
    const item = items[0];
    if (!item) throw new Error("expected launch fixture to contain an obligation");
    const maybe = { ...item, id: "maybe-1", title: "Only with a payroll" };
    const render = (locale?: "es", query = "") =>
      renderToStaticMarkup(
        <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
          <ObligationsList
            items={items}
            conditional={[
              {
                item: maybe,
                when: [
                  { field: "employeeCount", values: [500] },
                  { field: "fullTimeEmployeeCount", values: [100, 500] },
                  { field: "homeBased", values: [true] },
                ],
              },
            ]}
            asOf="2026-11-02"
            filters={filters({ query })}
            onFilters={() => undefined}
            locale={locale}
          />
        </TamaguiProvider>,
      );
    const html = render();
    expect(html).toContain("conditionally applicable");
    expect(html).toContain("Only with a payroll");
    expect(html).toContain("Applies if");
    expect(html).toContain("number of employees: more than 499");
    expect(html).toContain("number of full-time employees: more than 99");
    expect(html).toContain("yes");
    // it sits in the group of its own level, after the items there that do apply, and goes away with the search
    const level = (item.jurisdiction[0]?.toUpperCase() ?? "") + item.jurisdiction.slice(1);
    expect(html.indexOf("Only with a payroll")).toBeGreaterThan(html.indexOf(`${level}</`));
    expect(render(undefined, "zzzz-no-match")).not.toContain("conditionally applicable");
    expect(render("es")).toContain("aplicables según condiciones");
    // without the prop there is no section
    expect(
      renderToStaticMarkup(
        <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
          <ObligationsList items={items} asOf="2026-11-02" filters={filters()} onFilters={() => undefined} />
        </TamaguiProvider>,
      ),
    ).not.toContain("conditionally applicable");
  });

  it("shows conditionally applicable items in the launch list too, grouped by level, without a checkbox", () => {
    const item = items.find((candidate) => candidate.cost.basis === "unknown");
    if (!item) throw new Error("expected launch fixture to contain an obligation");
    const maybe = { ...item, id: "maybe-2", title: "Only with a payroll" };
    const conditional = [{ item: maybe, when: [{ field: "employeeCount", values: [1, 2] }] }];
    const html = render(<LaunchList plan={plan} costs={plan.costs} conditional={conditional} />);
    expect(html).toContain("Conditionally applicable");
    expect(html).toContain("Only with a payroll");
    expect(html).toContain("Applies if");
    expect(html).not.toContain("step-maybe-2");
    expect(render(<LaunchList plan={plan} costs={plan.costs} />)).not.toContain("Conditionally applicable");
  });

  it("lists the city first, then the county, the state and the federal rules", () => {
    const html = renderToStaticMarkup(
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <ObligationsList items={items} asOf="2026-11-02" filters={filters()} onFilters={() => undefined} />
      </TamaguiProvider>,
    );
    const headings = ["City", "County", "State", "Federal"]
      .map(
        (level) =>
          html.indexOf(`<h2`, html.indexOf(`>${level}</h2>`) - 400) >= 0 && html.indexOf(`>${level}</h2>`),
      )
      .filter((index): index is number => typeof index === "number" && index >= 0);
    expect(headings.length).toBeGreaterThan(1);
    expect(headings).toEqual([...headings].sort((a, b) => a - b));
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
    // a button with the checkbox role, named by its label (`htmlFor`), that is not checked yet
    expect(html).toMatch(/<button[^>]*role="checkbox"[^>]*aria-checked="false"/);
    expect(html).toMatch(/<label[^>]*for="step-/);
  });

  it("opens external links in new tabs and nofollows non-government links", () => {
    const html = render(
      <>
        <ExternalLink url="https://www.irs.gov/">Government</ExternalLink>
        <ExternalLink url="https://github.com/">Other</ExternalLink>
      </>,
    );
    expect(html).toContain('href="https://github.com/"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('rel="nofollow noopener noreferrer"');
  });

  it("renders the obligation context, text deadlines, and category counts", () => {
    const item = items.find((candidate) => candidate.cost.basis === "unknown");
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
    // the list is led by its filters; there is no heading or count above them
    expect(html).not.toContain("Find an obligation");
    expect(html).not.toContain("Showing 1 of");
    expect(html).toContain("Search obligations");
    expect(html).toContain("Category");
    expect(html).toContain("Data confidence");
    expect(html).toContain("All");
    expect(html).toContain("Federal");
    expect(html).toContain("State");
    expect(html).toContain("Before opening");
    expect(html).toContain("Fee");
    expect(html).toContain("If late");
    expect(html).toContain("Not listed");
    expect(html).toContain("Clear filters");
    expect(html).toContain('href="https://');
    expect(html).not.toContain("text-align:center");
  });
});

describe("business-obligations-ui in Spanish", () => {
  const plan = planLaunch(profile, { startDate: "2026-11-02", openingDate: "2027-02-01" });
  const spanish = localizePlan(plan, es);
  const render = (node: ReactElement) =>
    renderToStaticMarkup(
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        {node}
      </TamaguiProvider>,
    );

  it("shows the launch list in Spanish, with Spanish dates and relative times", () => {
    const html = render(<LaunchList plan={spanish} costs={spanish.costs} locale="es" onToggle={() => {}} />);
    expect(html).toContain("Presentar la constitución");
    expect(html).toContain("Listo para operar");
    expect(html).toContain("Tarifas conocidas");
    expect(html).toContain("Guardado en este navegador");
    expect(html).toContain("Preparar la presentación");
    expect(html).not.toContain("File formation");
    expect(html).not.toContain("Known fees");
    // Dates and relative times come from Intl in the locale: "2 nov 2026", "en 7 días".
    expect(html).toMatch(/\d{1,2} \w{3,4}\.? 2026/);
    expect(html).toContain("días");
    // US conventions for money: "$4.50", not "4,50 US$".
    expect(html).toMatch(/\$\d/);
    expect(html).not.toContain("US$");
  });

  it("shows the obligations list in Spanish", () => {
    const html = render(
      <ObligationsList
        items={spanish.result.items}
        asOf="2026-11-02"
        filters={filters()}
        onFilters={() => undefined}
        locale="es"
      />,
    );
    expect(html).not.toContain("Buscar una obligación");
    expect(html).not.toContain("Mostrando");
    expect(html).toContain("Categoría");
    expect(html).toContain("Estatal");
    expect(html).toContain("Anual");
    expect(html).not.toContain("Find an obligation");
    expect(html).not.toContain("Showing");
  });

  it("keeps English as the default and for unknown languages", () => {
    const base = render(<LaunchList plan={plan} costs={plan.costs} />);
    expect(render(<LaunchList plan={plan} costs={plan.costs} locale="en" />)).toBe(base);
    expect(base).toContain("Known fees");
    // A language without a table falls back to English text but formats dates for the locale.
    expect(render(<LaunchList plan={plan} costs={plan.costs} locale="fr" />)).toContain("Known fees");
  });

  it("accepts a custom message table for another language", () => {
    const html = render(
      <LaunchList
        plan={plan}
        costs={plan.costs}
        locale="fr"
        messages={{ ...messages.en, knownFees: "Frais connus", fileFormation: "Constitution" }}
      />,
    );
    expect(html).toContain("Frais connus");
    expect(html).toContain("Constitution");
  });

  it("finds Spanish text typed without accents", () => {
    const item = spanish.result.items.find((i) => /[áéíóúñ]/i.test(i.title));
    if (!item) throw new Error("expected a Spanish title with an accent");
    const plain = item.title.normalize("NFD").replace(/\p{M}/gu, "").slice(0, 12);
    const found = filterObligations(spanish.result.items, filters({ query: plain }));
    expect(found.some((candidate) => candidate.id === item.id)).toBe(true);
    // Upper case and accents do not matter.
    expect(filterObligations(spanish.result.items, filters({ query: plain.toUpperCase() })).length).toBe(
      found.length,
    );
  });

  it("has Spanish text for every message", () => {
    const keys = (value: unknown): string[] =>
      value && typeof value === "object"
        ? Object.entries(value).flatMap(([key, inner]) =>
            typeof inner === "object" ? keys(inner).map((k) => `${key}.${k}`) : [key],
          )
        : [];
    expect(keys(messages.es).sort()).toEqual(
      keys(messages.en)
        .sort()
        .filter((k) => !k.startsWith("fields."))
        .concat(keys(messages.es).filter((k) => k.startsWith("fields.")))
        .sort(),
    );
    expect(Object.keys(messages.es.fields).sort()).toEqual(Object.keys(messages.en.fields).sort());
    for (const [locale, table] of Object.entries(messages)) {
      expect(table.onTrack(1), locale).toBeTruthy();
      expect(table.onTrack(5), locale).not.toBe(table.onTrack(1));
      expect(table.toDo(2), locale).toBeTruthy();
    }
  });

  it("keeps one heading hierarchy: no h1, h2 for phases and jurisdictions, h3 for obligations", () => {
    const launch = render(<LaunchList plan={plan} locale="en" />);
    expect(launch).not.toContain("<h1");
    expect(launch).toContain("<h2");

    const list = render(
      <ObligationsList
        items={plan.result.items}
        asOf={plan.result.asOf}
        filters={filters()}
        onFilters={() => {}}
        locale="en"
      />,
    );
    expect(list).not.toContain("<h1");
    expect(list).toContain("<h2");
    expect(list).toContain("<h3");
  });

  it("labels each date as a suggested planning date or a statutory deadline, with what triggers the deadline", () => {
    const html = render(<LaunchList plan={plan} locale="en" />);
    expect(html).toContain("Suggested planning date:");
    expect(html).toContain("Statutory deadline:");
    expect(html).toContain("Applies because:");
  });
});
