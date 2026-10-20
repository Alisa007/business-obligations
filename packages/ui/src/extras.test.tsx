import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultConfig } from "@tamagui/config/v6";
import { TamaguiProvider, createTamagui } from "tamagui";
import { applyTheme } from "./theme/script";
import { buildCalendar, evaluate, planLaunch, type BusinessProfile } from "business-obligations";
import {
  CalendarDownload,
  CalendarList,
  LaunchList,
  LocationSummary,
  ObligationsList,
  ProfileForm,
  NO_OBLIGATION_FILTERS,
  ObligationsSummary,
  PlanSummary,
  ThemeProvider,
  ThemeToggle,
  useThemePreference,
} from "./index";

const config = createTamagui(defaultConfig);
const render = (element: ReactElement) =>
  renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme="light">
      {element}
    </TamaguiProvider>,
  );

const profile: BusinessProfile = {
  entityType: "llc",
  zip: "94105",
  city: "San Francisco",
  county: "San Francisco",
  state: "CA",
};

describe("LocationSummary", () => {
  it("summarizes the city when there is one, and not the county or state", () => {
    const html = render(<LocationSummary state="CA" county="San Francisco" city="San Francisco" />);
    expect(html).toContain("What is specific to San Francisco");
    expect(html).toContain("Renew San Francisco Business Registration Certificate");
    expect(html).not.toContain("State agencies");
  });

  it("falls back to the county, then the state", () => {
    const county = render(<LocationSummary state="TX" county="Travis" />);
    expect(county).toContain("What is specific to Travis");
    expect(county).not.toContain("State agencies");

    const state = render(<LocationSummary state="TX" />);
    expect(state).toContain("What is specific to Texas");
    expect(state).toContain("Texas Sales and Use Tax Permit");
    expect(state).toContain("Texas Secretary of State");
  });

  it("says when a place is not in the data, and speaks Spanish on request", () => {
    expect(render(<LocationSummary state="TX" city="Nowhereville" />)).toContain(
      "What is specific to Nowhereville",
    );
    expect(render(<LocationSummary state="TX" locale="es" />)).toContain("Lo específico de Texas");
  });
});

describe("calendar", () => {
  const { events, result } = buildCalendar(profile, { from: "2026-10-19" });

  it("lists dated deadlines, then the items without a date", () => {
    const html = render(<CalendarList events={events} items={result.items} />);
    expect(html).toContain(events[0]!.title);
    expect(html).toContain("No fixed date");
  });

  it("explains an empty calendar and omits the undated heading when there are none", () => {
    const html = render(<CalendarList events={[]} />);
    expect(html).toContain("No dated deadlines in the next year");
    expect(html).not.toContain("No fixed date");
    expect(evaluate(profile).items.length).toBeGreaterThan(0);
  });

  it("renders the download button", () => {
    expect(render(<CalendarDownload events={events} />)).toContain("Download .ics");
    expect(render(<CalendarDownload events={events} locale="es" />)).toContain("Descargar .ics");
  });
});

describe("theme", () => {
  it("renders light on the first pass and the toggle names the setting", () => {
    function Probe() {
      const { theme, preference } = useThemePreference();
      return (
        <span>
          {theme}/{preference}
        </span>
      );
    }
    const html = renderToStaticMarkup(
      <ThemeProvider config={config}>
        <Probe />
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(html).toContain("light/system");
    expect(html).toContain("System");
    expect(html).toContain('aria-label="Theme: System. Change"');
  });

  it("starts from the default preference", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider config={config} defaultPreference="dark" storageKey={null}>
        <ThemeToggle locale="es" />
      </ThemeProvider>,
    );
    expect(html).toContain("Oscuro");
  });
});

describe("PlanSummary and ObligationsSummary", () => {
  const plan = planLaunch(profile, { startDate: "2026-10-19" });
  const { items } = evaluate(profile);

  it("PlanSummary is about the launch: dates, fees and progress, and hides empty fees", () => {
    const html = render(<PlanSummary plan={plan} place="San Francisco" costs={{ oneTime: 0, annual: 0 }} />);
    expect(html).toContain("San Francisco");
    expect(html).toContain("File formation");
    expect(html).toContain("Ready to operate");
    expect(html).toContain(`0 of ${plan.steps.length} steps done`);
    expect(html).toContain("No opening date set");
    expect(html).not.toContain("Known fees");
    expect(html).not.toContain("Next deadline");
    expect(html).not.toContain("Local rules");
    expect(render(<PlanSummary plan={plan} place="SF" costs={{ oneTime: 50, annual: 800 }} />)).toContain(
      "Known fees",
    );
  });

  it("ObligationsSummary is about the obligations: count by level, next deadline, checked, local rules", () => {
    const html = render(
      <ObligationsSummary
        items={items}
        state="CA"
        county="San Francisco"
        city="San Francisco"
        next={{ title: "File the annual report", date: "2027-03-10" }}
        asOf="2026-10-19"
        dueSoon={2}
        checked={items.length}
      />,
    );
    expect(html).toContain(`${items.length} obligations`);
    expect(html).toContain("Federal");
    expect(html).toContain("Next deadline");
    expect(html).toContain("File the annual report");
    expect(html).toContain("2 due in the next 30 days");
    expect(html).toContain("All checked against official pages");
    expect(html).toContain("Local rules: Renew San Francisco Business Registration Certificate");
    expect(html).not.toContain("steps done");
    expect(html).not.toContain("File formation");
  });

  it("LaunchList can leave its own figures out", () => {
    const costs = { oneTime: 50, annual: 800 };
    expect(render(<LaunchList plan={plan} costs={costs} />)).toContain("Known fees");
    expect(render(<LaunchList plan={plan} costs={costs} summary={false} />)).not.toContain("Known fees");
  });
});

describe("conditions that lead to an input", () => {
  const item = evaluate(profile).items[0]!;
  const conditional = [
    {
      item,
      when: [
        { field: "employeeCount", values: [1, 2] },
        { field: "homeBased", values: [true] },
      ],
    },
  ];

  it("keeps the sentence of the condition, in either language", () => {
    const list = (locale: string) =>
      render(
        <ObligationsList
          items={[]}
          conditional={conditional}
          asOf="2026-10-19"
          filters={NO_OBLIGATION_FILTERS}
          onFilters={() => {}}
          locale={locale}
        />,
      );
    const en = list("en").replace(/<[^>]+>/g, "");
    expect(en).toContain("Applies if number of employees: more than 0; home-based business: yes");
    expect(list("es").replace(/<[^>]+>/g, "")).toContain("Aplica si");
  });

  it("turns a condition into a button for the host to handle", () => {
    const html = render(
      <ObligationsList
        items={[]}
        conditional={conditional}
        asOf="2026-10-19"
        filters={NO_OBLIGATION_FILTERS}
        onFilters={() => {}}
        onEditField={() => {}}
      />,
    );
    expect(html).toContain("<button");
    expect(html).toContain("number of employees: more than 0");
  });

  it("never puts a button inside a button (the card header holds links and condition buttons)", () => {
    const html = render(
      <ObligationsList
        items={evaluate(profile).items}
        conditional={conditional}
        asOf="2026-10-19"
        filters={NO_OBLIGATION_FILTERS}
        onFilters={() => {}}
        onEditField={() => {}}
      />,
    );
    let depth = 0;
    for (const [tag] of html.matchAll(/<\/?button\b/g)) {
      depth += tag === "</button" ? -1 : 1;
      expect(depth).toBeLessThanOrEqual(1);
    }
    expect(depth).toBe(0);
  });

  it("marks every row of the form with the choice it answers", () => {
    const html = render(<ProfileForm />);
    for (const field of [
      "entityType",
      "naics",
      "zip",
      "employeeCount",
      "fullTimeEmployeeCount",
      "annualPayroll",
      "homeBased",
      "openingDate",
    ])
      expect(html).toContain(`data-bo-field="${field}"`);
  });
});

describe("applyTheme", () => {
  const root = (...classes: string[]) => {
    const set = new Set(classes);
    return {
      set,
      classList: { add: (name: string) => set.add(name), remove: (name: string) => set.delete(name) },
      style: { colorScheme: "" },
    };
  };

  it("leaves exactly one theme class, whatever was on the element", () => {
    for (const before of [[], ["t_light"], ["t_dark"], ["t_light", "t_dark"]]) {
      for (const theme of ["light", "dark"] as const) {
        const element = root(...before, "keep-me");
        applyTheme(element, theme);
        expect([...element.set].filter((name) => name.startsWith("t_"))).toEqual([`t_${theme}`]);
        expect(element.set.has("keep-me")).toBe(true);
        expect(element.style.colorScheme).toBe(theme);
      }
    }
  });
});
