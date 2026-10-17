import { describe, expect, it } from "vitest";
import {
  evaluate,
  localize,
  localizePlan,
  localizeText,
  planLaunch,
  type BusinessProfile,
  type Catalog,
} from "../src";
import { en } from "../src/locales/en";
import { es } from "../src/locales/es";
import { collectCorpus } from "./helpers/i18n-corpus";

const base: BusinessProfile = {
  entityType: "llc",
  zip: "10001",
  city: "New York",
  county: "New York",
  state: "NY",
  industry: "restaurant",
  employeeCount: 4,
  sellsTaxableGoods: true,
  usesTradeName: true,
};

describe("localizeText", () => {
  const catalog: Catalog = {
    locale: "xx",
    strings: { Annual: "Anual", "April 15": "15 abril" },
    patterns: [
      ["File {1:n} forms in {2!}", "Presentar {1} formularios en {2}"],
      ["{1:w} online", "{1} en línea"],
      ["Renew {1} license; due {2!}", "Renovar licencia de {1}; vence {2}"],
    ],
    months: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
    monthDay: "{day} {month}",
  };

  it("prefers an exact string, then a pattern", () => {
    expect(localizeText("Annual", catalog)).toBe("Anual");
    expect(localizeText("$30 online", catalog)).toBe("$30 en línea");
  });

  it("translates the parts of a pattern in turn", () => {
    expect(localizeText("Renew Austin license; due Annual", catalog)).toBe(
      "Renovar licencia de Austin; vence Anual",
    );
  });

  it("leaves a text alone when a required part has no translation", () => {
    expect(localizeText("Renew Austin license; due sometime", catalog)).toBe(
      "Renew Austin license; due sometime",
    );
    expect(localizeText("File 3 forms in nowhere", catalog)).toBe("File 3 forms in nowhere");
  });

  it("respects typed parts", () => {
    expect(localizeText("two forms online", catalog)).toBe("two forms online");
    expect(localizeText("File x forms in Annual", catalog)).toBe("File x forms in Annual");
  });

  it("converts a text that is only dates, never dates inside a sentence", () => {
    expect(localizeText("April 15", catalog)).toBe("15 abril");
    expect(localizeText("January 31, April 30", catalog)).toBe("31 ene, 30 abr");
    expect(localizeText("File by April 15 or pay a penalty", catalog)).toBe(
      "File by April 15 or pay a penalty",
    );
  });

  it("translates a sentence list only when every sentence has a translation", () => {
    const sentences: Catalog = { locale: "xx", strings: { "One.": "Uno.", "Two.": "Dos." } };
    expect(localizeText("One. Two.", sentences)).toBe("Uno. Dos.");
    expect(localizeText("One. Three.", sentences)).toBe("One. Three.");
  });

  it("keeps surrounding whitespace", () => {
    expect(localizeText(" Annual ", catalog)).toBe(" Anual ");
  });
});

describe("en catalog", () => {
  it("names enum values", () => {
    const result = localize(evaluate(base, { asOf: "2026-01-01" }), en);
    const annual = result.items.find((i) => i.frequency === "annual");
    expect(annual?.labels.frequency).toBe("Annual");
    expect(result.locale).toBe("en");
  });
});

describe("es catalog", () => {
  const asOf = "2026-01-01";

  it("translates the plan, its phases and the labels", () => {
    const plan = planLaunch({ ...base, state: "TX", county: "Travis", city: "Austin" }, { startDate: asOf });
    const localized = localizePlan(plan, es);
    expect(localized.locale).toBe("es");
    expect(localized.phases[0]?.title).toBe("Preparar la presentación");
    expect(localized.steps.length).toBe(plan.steps.length);
    const ein = localized.result.items.find((i) => i.ruleId === "fed.ein");
    expect(ein?.title).toBe("Obtener un Número de Identificación de Empleador (EIN)");
    expect(ein?.labels.category).toBe("Registro");
    expect(ein?.labels.filingMethod).toContain("En línea");
    expect(localized.result.disclaimer).toMatch(/^Información general/);
    // The same items are used in the phases, the steps and the result.
    const step = localized.steps.find((s) => s.item.ruleId === "fed.ein");
    expect(step?.item.title).toBe(ein?.title);
  });

  it("keeps ids, dates and amounts as they were", () => {
    const result = evaluate(base, { asOf });
    const localized = localize(result, es);
    expect(localized.items.map((i) => i.id)).toEqual(result.items.map((i) => i.id));
    expect(localized.items.map((i) => i.nextDue)).toEqual(result.items.map((i) => i.nextDue));
    expect(localized.items.map((i) => i.cost?.amount)).toEqual(result.items.map((i) => i.cost?.amount));
  });

  it("writes dates inside a deadline in Spanish", () => {
    expect(localizeText("April 30, July 31, October 31, January 31", es)).toBe(
      "30 de abril, 31 de julio, 31 de octubre, 31 de enero",
    );
  });

  it("translates every text the engine can show", { timeout: 120_000 }, () => {
    // Official agency names (the `authority` field) stay as the agency writes them.
    const { corpus } = collectCorpus();
    const untranslated = [...corpus]
      .filter(([text, meta]) => meta.field !== "authority" && localizeText(text, es) === text)
      .map(([text, meta]) => `[${meta.ruleId}] ${meta.field}: ${text}`);
    expect(untranslated).toEqual([]);
  });

  it("leaves no English template word in a translated rule text", () => {
    const result = localize(evaluate(base, { asOf }), es);
    for (const item of result.items) {
      expect(item.description).not.toMatch(/\b(the|and|must|required)\b/i);
      expect(item.reason).not.toMatch(/\b(the|and|must|required)\b/i);
    }
  });
});
