/**
 * The code of a small script for the page's `<head>` that runs before the first paint: a saved "light" or "dark" is put
 * on `<html>` as Tamagui's theme class, so the page does not start in the device's theme and then change, and the
 * browser's own controls and scrollbars get the right color scheme. For "system" the stylesheet already follows the
 * device. It does not use React, so a server component can import it from `business-obligations-ui/theme-script`:
 *
 *     <script dangerouslySetInnerHTML={{ __html: themeScript() }} />
 */
export function themeScript(storageKey = "bo-theme"): string {
  return `try{var p=localStorage.getItem(${JSON.stringify(storageKey)}),d=document.documentElement;if(p==="light"||p==="dark"){d.classList.add("t_"+p);d.style.colorScheme=p}else{d.style.colorScheme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}}catch(e){}`;
}

/** The minimum of an element that `applyTheme` works on (`document.documentElement`, or a stand-in in a test). */
export interface ThemeRoot {
  classList: { add(name: string): void; remove(name: string): void };
  style: { colorScheme: string };
}

/**
 * Makes `root` carry exactly one of Tamagui's theme classes, `t_light` or `t_dark`, and the matching color scheme.
 * The class is added by the pre-paint script, by Tamagui and by this package, in that order, so the other one is
 * removed here: with both, the stylesheet would pick whichever comes later in it.
 */
export function applyTheme(root: ThemeRoot, theme: "light" | "dark"): void {
  root.classList.remove(theme === "dark" ? "t_light" : "t_dark");
  root.classList.add(`t_${theme}`);
  root.style.colorScheme = theme;
}
