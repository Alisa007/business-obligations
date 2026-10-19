import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultConfig } from "@tamagui/config/v6";
import { TamaguiProvider, createTamagui } from "tamagui";
import { buildCalendar, evaluate, type BusinessProfile } from "business-obligations";
import {
  CalendarDownload,
  CalendarList,
  LocationSummary,
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
