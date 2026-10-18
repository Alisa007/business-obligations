import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultConfig } from "@tamagui/config/v6";
import { TamaguiProvider, createTamagui } from "tamagui";
import { ENTITY_TYPES } from "business-obligations";
import {
  DETAIL_FIELDS,
  DetailsField,
  EmployeesField,
  IndustryField,
  PROFILE_DEFAULTS,
  ProfileQueryProvider,
  TypeField,
  messages,
  readProfileQuery,
  setProfileQuery,
  writeProfileQuery,
} from "../index";

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
    expect(readProfileQuery("?type=spaceship&naics=nope&employees=-4&sells=maybe")).toEqual(PROFILE_DEFAULTS);
    expect(readProfileQuery("?employees=3.5")).toEqual(PROFILE_DEFAULTS);
  });

  it("reads each choice from its parameter", () => {
    const choices = readProfileQuery("?type=pllc&naics=621111&employees=12&sells=1&home=true&food=0");
    expect(choices).toMatchObject({
      entityType: "pllc",
      naics: "621111",
      employeeCount: 12,
      sellsTaxableGoods: true,
      homeBased: true,
      foodService: false,
    });
  });

  it("tells an empty head count (not given) from 0", () => {
    expect(PROFILE_DEFAULTS.employeeCount).toBeUndefined();
    expect(readProfileQuery("").employeeCount).toBeUndefined();
    expect(readProfileQuery("?employees=").employeeCount).toBeUndefined();
    expect(readProfileQuery("?employees=0").employeeCount).toBe(0);
    expect(writeProfileQuery("", PROFILE_DEFAULTS)).toBe("");
    expect(writeProfileQuery("", { ...PROFILE_DEFAULTS, employeeCount: 0 })).toBe("?employees=0");
    // a host that starts from 0: "not given" has to be written to be told apart
    const zero = { ...PROFILE_DEFAULTS, employeeCount: 0 };
    expect(writeProfileQuery("?employees=5", { ...zero, employeeCount: undefined }, zero)).toBe(
      "?employees=",
    );
    expect(readProfileQuery("", zero).employeeCount).toBe(0);
  });

  it("reads each yes/no detail as yes, no or not answered yet", () => {
    expect(PROFILE_DEFAULTS.homeBased).toBeUndefined();
    expect(readProfileQuery("").homeBased).toBeUndefined();
    expect(readProfileQuery("?home=1").homeBased).toBe(true);
    expect(readProfileQuery("?home=0").homeBased).toBe(false);
    expect(readProfileQuery("?home=").homeBased).toBeUndefined();
    expect(readProfileQuery("?home=maybe").homeBased).toBeUndefined();
    expect(writeProfileQuery("", { ...PROFILE_DEFAULTS, homeBased: false, hasSignage: true })).toBe(
      "?home=0&signage=1",
    );
    // a host that says yes by default: "not answered" has to be written to be told apart
    const yes = { ...PROFILE_DEFAULTS, homeBased: true };
    expect(writeProfileQuery("", { ...yes, homeBased: undefined }, yes)).toBe("?home=");
    expect(readProfileQuery("?home=", yes).homeBased).toBeUndefined();
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
      naics: "453998",
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
    const { location } = fakeWindow("?type=llp&naics=44");
    setProfileQuery({ entityType: undefined });
    expect(location.search).toBe("?naics=44");
  });

  it("does nothing when nothing changes", () => {
    const { replaceState, events } = fakeWindow("?type=llp");
    setProfileQuery({ entityType: "llp" });
    expect(replaceState).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });
});

describe("the inputs", () => {
  it("TypeField is a labeled Tamagui select that shows the current type", () => {
    const html = render(<TypeField />);
    expect(html).toContain("Business type");
    expect(html).toContain("Select a business type");
    expect(html).not.toContain("<option");
  });

  it("TypeField follows the type in the host's defaults", () => {
    const html = render(
      <ProfileQueryProvider defaults={{ entityType: "s_corp" }}>
        <TypeField />
      </ProfileQueryProvider>,
    );
    expect(html).toContain("S corporation");
  });

  it("IndustryField is a labeled text box that starts empty, with the hint for no code", () => {
    const html = render(<IndustryField />);
    expect(html).toContain("Industry (NAICS code)");
    expect(html).toContain('placeholder="Type a code or a word, e.g. restaurant"');
    expect(html).toContain("Leave empty if none fits; general rules apply.");
    expect(html).not.toContain("<option");
  });

  it("IndustryField shows the code from the address or the host's defaults", () => {
    const html = render(
      <ProfileQueryProvider defaults={{ naics: "722511" }}>
        <IndustryField />
      </ProfileQueryProvider>,
    );
    expect(html).toContain('value="722511"');
    expect(html).toContain("NAICS 722511");
  });

  it("EmployeesField is a labeled numeric field for 0 to 10,000", () => {
    const html = render(<EmployeesField />);
    expect(html).toContain("Employees");
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('maxLength="5"');
  });

  it("EmployeesField is empty, with a placeholder, when the host leaves the head count out", () => {
    const html = render(
      <ProfileQueryProvider defaults={{ employeeCount: undefined }}>
        <EmployeesField placeholder="0" />
      </ProfileQueryProvider>,
    );
    expect(html).toContain('placeholder="0"');
    expect(html).not.toContain('value="0"');
  });

  it("IndustryField has a clear button once it holds a code, and none while empty", () => {
    const empty = render(<IndustryField />);
    expect(empty).not.toContain('aria-label="Clear"');
    const filled = render(
      <ProfileQueryProvider defaults={{ naics: "722511" }}>
        <IndustryField />
      </ProfileQueryProvider>,
    );
    expect(filled).toContain('aria-label="Clear"');
  });

  it("DetailsField shows every detail as not answered yet, until it is answered", () => {
    const html = render(<DetailsField />);
    expect((html.match(/Not answered yet/g) ?? []).length).toBe(DETAIL_FIELDS.length - 1); // no S election for an LLC
    const answered = render(
      <ProfileQueryProvider defaults={{ homeBased: false, hasSignage: true }}>
        <DetailsField />
      </ProfileQueryProvider>,
    );
    expect(answered).toContain(">No<");
    expect(answered).toContain(">Yes<");
    expect(answered).toContain('aria-checked="mixed"');
    expect(render(<DetailsField locale="es" />)).toContain("Sin responder");
  });

  it("DetailsField can hide its legend visually", () => {
    const html = render(<DetailsField legend={false} />);
    expect(html).toContain("Run from home");
    expect(html).toMatch(/<legend[^>]*clip/);
  });

  it("show the host's defaults until the URL says otherwise", () => {
    const html = render(
      <ProfileQueryProvider defaults={{ entityType: "pc", naics: "722", employeeCount: 3 }}>
        <TypeField />
        <IndustryField />
        <EmployeesField />
      </ProfileQueryProvider>,
    );
    expect(html).toContain("Professional corporation");
    expect(html).toContain('value="722"');
    expect(html).toContain('value="3"');
  });

  it("DetailsField shows a labeled checkbox for every detail, and 'not formed yet'", () => {
    const html = render(<DetailsField />);
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
    expect(html).toContain("Not formed yet");
    expect(html).not.toContain("S election in effect");
  });

  it("DetailsField offers the S election only to corporations that can make one", () => {
    const html = render(
      <ProfileQueryProvider defaults={{ entityType: "pc" }}>
        <DetailsField />
      </ProfileQueryProvider>,
    );
    expect(html).toContain("S election in effect");
  });

  it("speaks Spanish with locale='es'", () => {
    const html = render(
      <>
        <TypeField locale="es" />
        <IndustryField locale="es" />
        <EmployeesField locale="es" />
        <DetailsField locale="es" />
      </>,
    );
    for (const text of [
      "Tipo de negocio",
      "Sector (código NAICS)",
      "Empleados",
      "Detalles",
      "Seleccione un tipo de negocio",
      "Vende bienes gravables",
    ]) {
      expect(html).toContain(text);
    }
  });

  it("has Spanish text for every business-details label", () => {
    expect(Object.keys(messages.es.profile.entityTypes).sort()).toEqual([...ENTITY_TYPES].sort());
    expect(Object.keys(messages.es.profile.detailLabels).sort()).toEqual([...DETAIL_FIELDS].sort());
  });
});
