import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultConfig } from "@tamagui/config/v6";
import { TamaguiProvider, createTamagui } from "tamagui";
import { ENTITY_TYPES, INDUSTRIES } from "business-obligations";
import {
  DETAIL_FIELDS,
  DetailsInput,
  EmployeesInput,
  IndustryInput,
  PROFILE_DEFAULTS,
  ProfileQueryProvider,
  TypeInput,
  messages,
  readProfileQuery,
  setProfileQuery,
  writeProfileQuery,
} from "./index";

const tamaguiConfig = createTamagui(defaultConfig);
const render = (element: ReactElement) =>
  renderToStaticMarkup(
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      {element}
    </TamaguiProvider>,
  );

describe("reading and writing the query string", () => {
  it("falls back to the defaults for an empty or invalid query", () => {
    expect(readProfileQuery("")).toEqual(PROFILE_DEFAULTS);
    expect(readProfileQuery("?type=spaceship&industry=nope&employees=-4&sells=maybe")).toEqual(
      PROFILE_DEFAULTS,
    );
    expect(readProfileQuery("?employees=3.5")).toEqual(PROFILE_DEFAULTS);
  });

  it("reads each choice from its parameter", () => {
    const choices = readProfileQuery("?type=pllc&industry=healthcare&employees=12&sells=1&home=true&food=0");
    expect(choices).toMatchObject({
      entityType: "pllc",
      industry: "healthcare",
      employeeCount: 12,
      sellsTaxableGoods: true,
      homeBased: true,
      foodService: false,
    });
  });

  it("limits employees to 10,000", () => {
    expect(readProfileQuery("?employees=99999").employeeCount).toBe(10_000);
  });

  it("writes only what differs from the defaults, and keeps other parameters", () => {
    const choices = { ...PROFILE_DEFAULTS, entityType: "s_corp" as const, employeeCount: 4, homeBased: true };
    expect(writeProfileQuery("?utm=x", choices)).toBe("?utm=x&type=s_corp&employees=4&home=1");
    expect(writeProfileQuery("?type=s_corp&employees=4", PROFILE_DEFAULTS)).toBe("");
  });

  it("writes a ticked box that defaults to ticked as 0 when it is cleared", () => {
    const defaults = { ...PROFILE_DEFAULTS, sellsTaxableGoods: true };
    expect(writeProfileQuery("", { ...defaults, sellsTaxableGoods: false }, defaults)).toBe("?sells=0");
    expect(readProfileQuery("?sells=0", defaults).sellsTaxableGoods).toBe(false);
    expect(readProfileQuery("", defaults).sellsTaxableGoods).toBe(true);
  });

  it("round-trips every choice", () => {
    const choices = {
      ...PROFILE_DEFAULTS,
      entityType: "benefit_corp" as const,
      industry: "cannabis" as const,
      employeeCount: 250,
      ...Object.fromEntries(DETAIL_FIELDS.map((field) => [field, true])),
    };
    expect(readProfileQuery(writeProfileQuery("", choices))).toEqual(choices);
  });
});

describe("changing the address bar", () => {
  afterEach(() => vi.unstubAllGlobals());

  const fakeWindow = (search: string) => {
    const location = { pathname: "/start/ohio/", search, hash: "#plan" };
    const events: string[] = [];
    const replaceState = vi.fn((_state: unknown, _title: string, url: string) => {
      const [path, rest = ""] = url.split("?");
      location.pathname = path ?? "";
      location.search = rest ? `?${rest.split("#")[0]}` : "";
    });
    vi.stubGlobal("window", {
      location,
      history: { state: null, replaceState },
      dispatchEvent: (event: Event) => events.push(event.type),
    });
    return { location, replaceState, events };
  };

  it("replaces the URL without a new history entry, keeps the path and hash, and tells the inputs", () => {
    const { location, replaceState, events } = fakeWindow("?utm=x");
    setProfileQuery({ entityType: "llp", employeeCount: 2 });
    expect(replaceState).toHaveBeenCalledWith(null, "", "/start/ohio/?utm=x&type=llp&employees=2#plan");
    expect(location.search).toBe("?utm=x&type=llp&employees=2");
    expect(events).toEqual(["business-obligations:profile-query"]);
  });

  it("builds on what the URL already holds and drops a choice that returns to its default", () => {
    const { location } = fakeWindow("?type=llp&industry=retail");
    setProfileQuery({ entityType: "llc" });
    expect(location.search).toBe("?industry=retail");
  });

  it("does nothing when nothing changes", () => {
    const { replaceState, events } = fakeWindow("?type=llp");
    setProfileQuery({ entityType: "llp" });
    expect(replaceState).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });
});

describe("the inputs", () => {
  it("TypeInput lists every entity type from the engine, labeled, with the default selected", () => {
    const html = render(<TypeInput />);
    expect(html).toContain("Business type");
    expect((html.match(/<option/g) ?? []).length).toBe(ENTITY_TYPES.length);
    expect(html).toContain('value="s_corp"');
    expect(html).toContain("S corporation");
    expect(html).toMatch(/<option[^>]*value="llc"[^>]*selected|<option[^>]*selected[^>]*value="llc"/);
  });

  it("IndustryInput lists every industry from the engine", () => {
    const html = render(<IndustryInput />);
    expect(html).toContain("Industry");
    expect((html.match(/<option/g) ?? []).length).toBe(INDUSTRIES.length);
    expect(html).toContain("Real estate");
  });

  it("EmployeesInput is a labeled number field from 0 to 10,000", () => {
    const html = render(<EmployeesInput />);
    expect(html).toContain("Employees");
    expect(html).toContain('type="number"');
    expect(html).toContain('max="10000"');
    expect(html).toContain('min="0"');
  });

  it("show the host's defaults until the URL says otherwise", () => {
    const html = render(
      <ProfileQueryProvider defaults={{ entityType: "pc", industry: "restaurant", employeeCount: 3 }}>
        <TypeInput />
        <IndustryInput />
        <EmployeesInput />
      </ProfileQueryProvider>,
    );
    expect(html).toMatch(/value="pc"[^>]*selected|selected[^>]*value="pc"/);
    expect(html).toMatch(/value="restaurant"[^>]*selected|selected[^>]*value="restaurant"/);
    expect(html).toContain('value="3"');
  });

  it("DetailsInput shows a labeled checkbox for every detail, but not 'not formed yet'", () => {
    const html = render(<DetailsInput />);
    expect(html).toContain("Details");
    for (const label of [
      "Sells taxable goods",
      "Run from home",
      "Uses a trade name (DBA)",
      "Has tax-exempt status",
      "Has exterior signage",
      "Prepares or serves food",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).not.toMatch(/formed/i);
    expect(html).not.toContain("S election in effect");
  });

  it("DetailsInput offers the S election only to corporations that can make one", () => {
    const html = render(
      <ProfileQueryProvider defaults={{ entityType: "pc" }}>
        <DetailsInput />
      </ProfileQueryProvider>,
    );
    expect(html).toContain("S election in effect");
  });

  it("DetailsInput can be limited to some fields", () => {
    const html = render(<DetailsInput fields={["homeBased"]} />);
    expect(html).toContain("Run from home");
    expect(html).not.toContain("Sells taxable goods");
  });

  it("speaks Spanish with locale='es'", () => {
    const html = render(
      <>
        <TypeInput locale="es" />
        <IndustryInput locale="es" />
        <EmployeesInput locale="es" />
        <DetailsInput locale="es" />
      </>,
    );
    for (const text of [
      "Tipo de negocio",
      "Sector",
      "Empleados",
      "Detalles",
      "Corporación profesional",
      "Comercio minorista",
      "Vende bienes gravables",
    ]) {
      expect(html).toContain(text);
    }
  });

  it("has Spanish text for every business-details label", () => {
    expect(Object.keys(messages.es.profile.entityTypes).sort()).toEqual([...ENTITY_TYPES].sort());
    expect(Object.keys(messages.es.profile.industries).sort()).toEqual([...INDUSTRIES].sort());
    expect(Object.keys(messages.es.profile.detailLabels).sort()).toEqual([...DETAIL_FIELDS].sort());
  });
});
