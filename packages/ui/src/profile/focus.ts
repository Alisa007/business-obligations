/** Names the engine uses in conditions that are answered by a differently named choice. */
const ANSWERED_BY: Record<string, string> = { industry: "naics", city: "zip", county: "zip", state: "zip" };

const rowOf = (field: string) =>
  typeof document === "undefined"
    ? null
    : document.querySelector<HTMLElement>(`[data-bo-field="${ANSWERED_BY[field] ?? field}"]`);

/** Whether this page has an input that answers `field` (an engine field such as `employeeCount`). */
export const hasProfileField = (field: string): boolean => rowOf(field) !== null;

/**
 * Takes the visitor to the input that answers `field`: opens the section around it if that is closed, scrolls it into
 * view, focuses it and flashes its row. Returns false when the page has no such input (the form is not shown, or the
 * host fixed that answer). Each row of `ProfileForm` is marked `data-bo-field`, which is how it is found.
 */
export function focusProfileField(field: string): boolean {
  const row = rowOf(field);
  if (!row) return false;
  // A closed section hides its content; its header is the button that controls it.
  const region = row.closest<HTMLElement>('[role="region"]');
  if (region && region.style.visibility === "hidden") {
    document.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(region.id)}"]`)?.click();
  }
  // After the section has had a render to open (its content is focusable as soon as it is visible again).
  setTimeout(() => {
    row.scrollIntoView({ block: "center", behavior: "smooth" });
    // The row's label points at its control, so that is what takes the focus.
    const label = row.querySelector<HTMLLabelElement>("label[for]");
    (label
      ? document.getElementById(label.htmlFor)
      : row.querySelector<HTMLElement>("input, select, textarea")
    )?.focus({
      preventScroll: true,
    });
    try {
      row.animate(
        [{ boxShadow: "0 0 0 3px var(--accent-background)" }, { boxShadow: "0 0 0 3px transparent" }],
        { duration: 1400, easing: "ease-out" },
      );
    } catch {
      /* no animation support: the focus ring is enough */
    }
  }, 60);
  return true;
}
