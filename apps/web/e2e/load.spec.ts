import { expect, test, type Page } from "@playwright/test";

/** What the page may move while it loads, as the browser measures it (Core Web Vitals call under 0.1 good). */
const MAX_LAYOUT_SHIFT = 0.01;

/** The cumulative layout shift of loading `url`, once the plan has appeared (when there is a ZIP code to make one). */
async function layoutShiftOf(page: Page, url: string) {
  await page.addInitScript(() => {
    const w = window as unknown as { __shift: number };
    w.__shift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean }>)
        if (!entry.hadRecentInput) w.__shift += entry.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(url);
  if (url.includes("zip=")) await page.getByRole("tab", { name: /Launch plan/ }).waitFor();
  await page.waitForTimeout(600); // anything that settles late still counts
  return page.evaluate(() => (window as unknown as { __shift: number }).__shift);
}

const ADDRESSES = ["/", "/?zip=10036&employees=500", "/?zip=94105&type=llc&sells=1"];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`with a ${scheme} device`, () => {
    test.use({ colorScheme: scheme });

    for (const address of ADDRESSES)
      test(`${address} does not jump while loading`, async ({ page }) => {
        expect(await layoutShiftOf(page, address)).toBeLessThan(MAX_LAYOUT_SHIFT);
      });
  });
}

test("the form shows what the address says, already filled in", async ({ page }) => {
  await page.goto("/?zip=10036&employees=500");
  await expect(page.getByLabel("ZIP code")).toHaveValue("10036");
  // a section with an answer in it starts open, so the answer is there to see
  await expect(page.getByRole("button", { name: "Size (1)" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("Employees", { exact: true })).toHaveValue("500");
});

test("a saved theme is on <html> with a single theme class, whatever the device prefers", async ({
  browser,
}) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  await context.addInitScript(() => localStorage.setItem("bo-theme", "light"));
  const page = await context.newPage();
  await page.goto("/?zip=10036");
  await page.getByRole("tab", { name: /Launch plan/ }).waitFor();
  const classes = await page.evaluate(() =>
    [...document.documentElement.classList].filter((c) => c.startsWith("t_")),
  );
  expect(classes).toEqual(["t_light"]);
  await context.close();
});
