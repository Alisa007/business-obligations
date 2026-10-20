// @vitest-environment happy-dom
import type { ReactElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultConfig } from "@tamagui/config/v6";
import { TamaguiProvider, createTamagui } from "tamagui";
import { evaluate, type BusinessProfile } from "business-obligations";
import {
  Collapse,
  NO_OBLIGATION_FILTERS,
  ObligationsList,
  ProfileForm,
  ThemeProvider,
  ThemeToggle,
  focusProfileField,
} from "./index";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const config = createTamagui(defaultConfig);
let root: Root | undefined;
let host: HTMLElement;

/** Renders into the document, as a browser would, and lets effects and updates settle. */
async function mount(element: ReactElement) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(
      <TamaguiProvider config={config} defaultTheme="light">
        {element}
      </TamaguiProvider>,
    );
  });
}

const press = async (element: Element) => {
  await act(async () => {
    (element as HTMLElement).click();
  });
};

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  localStorage.clear();
  document.documentElement.className = "";
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  host?.remove();
  vi.useRealTimers();
});

describe("Collapse", () => {
  it("opens and closes from its header button", async () => {
    await mount(
      <Collapse level={3} summary="Title">
        <p>Body</p>
      </Collapse>,
    );
    const header = host.querySelector("button[aria-expanded]")!;
    expect(header.getAttribute("aria-expanded")).toBe("false");
    await press(header);
    expect(header.getAttribute("aria-expanded")).toBe("true");
    await press(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");
  });

  it("with its own links in the summary: only the chevron is a button, and nothing nests", async () => {
    await mount(
      <Collapse
        level={3}
        toggleLabel="Item"
        summary={
          <span>
            <a href="https://example.gov">Title</a> <button type="button">Condition</button>{" "}
            <span>blank</span>
          </span>
        }
      >
        <p>Body</p>
      </Collapse>,
    );
    expect(host.querySelectorAll("button button, button a").length).toBe(0);
    const toggle = host.querySelector("button[aria-expanded]")!;
    expect(toggle.getAttribute("aria-label")).toBe("Item");

    await press(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    // the blank part of the row toggles too ...
    await press(host.querySelector("span > span")!);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    // ... but a press that belongs to a link or a button in the summary does not
    await press(host.querySelector("a")!);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    await press([...host.querySelectorAll("button")].find((b) => b.textContent === "Condition")!);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("focusProfileField and the form", () => {
  it("is hidden until the page is running, then ready", async () => {
    await mount(<ProfileForm compact />);
    expect(host.querySelector("form")!.getAttribute("data-ready")).toBe("true");
  });

  it("opens a closed section and focuses the input that answers the field", async () => {
    vi.useFakeTimers();
    await mount(<ProfileForm compact />);
    const size = [...host.querySelectorAll("button[aria-expanded]")].find((b) =>
      /size/i.test(b.textContent ?? ""),
    )!;
    expect(size.getAttribute("aria-expanded")).toBe("false");

    expect(focusProfileField("employeeCount")).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(size.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement?.closest("[data-bo-field]")?.getAttribute("data-bo-field")).toBe(
      "employeeCount",
    );
  });

  it("finds the same input from the engine's name for it, and says so when there is none", async () => {
    vi.useFakeTimers();
    await mount(<ProfileForm compact />);
    expect(focusProfileField("industry")).toBe(true); // answered by the NAICS field
    expect(focusProfileField("city")).toBe(true); // answered by the ZIP field
    expect(focusProfileField("noSuchField")).toBe(false);
  });
});

describe("sections of the compact form", () => {
  it("open for what the visitor answered, not for what the host fixed", async () => {
    await mount(<ProfileForm compact values={{ isFormed: true, zip: "10036" }} />);
    const details = [...host.querySelectorAll("button[aria-expanded]")].find((b) =>
      /details/i.test(b.textContent ?? ""),
    )!;
    expect(details.textContent).not.toMatch(/\(\d+\)/);
    expect(details.getAttribute("aria-expanded")).toBe("false");
  });

  it("open, with the count, for an answer in the address", async () => {
    window.history.replaceState(null, "", "/?employees=5");
    await mount(<ProfileForm compact />);
    const size = [...host.querySelectorAll("button[aria-expanded]")].find((b) =>
      /^size/i.test(b.textContent ?? ""),
    )!;
    expect(size.textContent).toContain("(1)");
    expect(size.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("a condition on an item", () => {
  const profile: BusinessProfile = {
    entityType: "llc",
    zip: "94105",
    city: "San Francisco",
    county: "San Francisco",
    state: "CA",
  };
  const item = evaluate(profile).items[0]!;

  it("becomes a link once the form is on the page, and leads to its input", async () => {
    vi.useFakeTimers();
    await mount(
      <>
        <ProfileForm compact />
        <ObligationsList
          items={[]}
          conditional={[{ item, when: [{ field: "fullTimeEmployeeCount", values: [1] }] }]}
          asOf="2026-10-19"
          filters={NO_OBLIGATION_FILTERS}
          onFilters={() => {}}
        />
      </>,
    );
    const link = [...host.querySelectorAll("button")].find((b) =>
      /full-time employees/.test(b.textContent ?? ""),
    )!;
    expect(link).toBeTruthy();
    expect(host.querySelectorAll("button button").length).toBe(0);
    await press(link);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(document.activeElement?.closest("[data-bo-field]")?.getAttribute("data-bo-field")).toBe(
      "fullTimeEmployeeCount",
    );
  });

  it("stays plain text when nothing on the page answers it", async () => {
    await mount(
      <ObligationsList
        items={[]}
        conditional={[{ item, when: [{ field: "fullTimeEmployeeCount", values: [1] }] }]}
        asOf="2026-10-19"
        filters={NO_OBLIGATION_FILTERS}
        onFilters={() => {}}
      />,
    );
    const text = host.textContent ?? "";
    expect(text).toContain("number of full-time employees: more than 0");
    expect(
      [...host.querySelectorAll("button")].some((b) => /full-time employees/.test(b.textContent ?? "")),
    ).toBe(false);
  });
});

describe("ThemeProvider", () => {
  const themeClasses = () => [...document.documentElement.classList].filter((name) => name.startsWith("t_"));

  it("applies the saved setting before anything else is shown, with exactly one theme class", async () => {
    localStorage.setItem("bo-theme", "dark");
    await mount(
      <ThemeProvider config={config}>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(themeClasses()).toEqual(["t_dark"]);
    expect(document.documentElement.style.colorScheme).toBe("dark");
    const toggle = host.querySelector("button")!;
    expect(toggle.textContent).toBe("Dark");
    expect((toggle as HTMLElement).style.visibility).toBe(""); // shown, now that the saved setting is known
  });

  it("repairs an <html> that already has both theme classes (the pre-paint script and Tamagui each add one)", async () => {
    document.documentElement.classList.add("t_light", "t_dark");
    localStorage.setItem("bo-theme", "light");
    await mount(
      <ThemeProvider config={config}>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(themeClasses()).toEqual(["t_light"]);
  });

  it("goes round system, light and dark, remembers it, and keeps a single class throughout", async () => {
    await mount(
      <ThemeProvider config={config}>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const toggle = host.querySelector("button")!;
    expect(toggle.textContent).toBe("System");
    for (const [label, saved, theme] of [
      ["Light", "light", "t_light"],
      ["Dark", "dark", "t_dark"],
      ["System", "system", undefined],
    ] as const) {
      await press(toggle);
      expect(toggle.textContent).toBe(label);
      expect(localStorage.getItem("bo-theme")).toBe(saved);
      expect(themeClasses().length).toBe(1);
      if (theme) expect(themeClasses()).toEqual([theme]);
    }
  });
});
