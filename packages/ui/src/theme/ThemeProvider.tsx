import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Button, TamaguiProvider } from "tamagui";
import { WithLocale, useI18n } from "../i18n/context";
import { useBeforePaint } from "../shared/hooks";
import type { Messages } from "../i18n/messages";
import { applyTheme, themeScript } from "./script";

export type ThemePreference = "system" | "light" | "dark";

export interface ThemeState {
  /** What the visitor chose; "system" follows the device. */
  preference: ThemePreference;
  /** The theme in use. */
  theme: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
  /** Whether the saved setting has been read (false on the server and while hydrating). */
  ready: boolean;
}

const ORDER: ThemePreference[] = ["system", "light", "dark"];
const DARK_QUERY = "(prefers-color-scheme: dark)";
const ThemeContext = /* @__PURE__ */ createContext<ThemeState>({
  preference: "system",
  theme: "light",
  setPreference: () => {},
  ready: true,
});

/** The theme in use and a way to change it. Outside a `ThemeProvider` it is light and changing it does nothing. */
export const useThemePreference = () => useContext(ThemeContext);

const isPreference = (value: unknown): value is ThemePreference => ORDER.includes(value as ThemePreference);

export interface ThemeProviderProps {
  /** The Tamagui config the app is built with (the result of `createTamagui`). */
  config: React.ComponentProps<typeof TamaguiProvider>["config"];
  /** Used until the visitor chooses. "system" (the default) follows the device. */
  defaultPreference?: ThemePreference;
  /** Where the choice is remembered in this browser; `null` to not remember it. */
  storageKey?: string | null;
  children: ReactNode;
}

/**
 * `TamaguiProvider` with light, dark and "follow the device". The server's HTML has no theme class of its own, so a
 * device that prefers dark gets dark from the stylesheet alone (Tamagui's `prefers-color-scheme` rules). The saved or
 * device setting is applied before the first paint after hydration; to also have a saved light or dark in place
 * before the page's script has loaded, put `<ThemeScript />` in the `<head>`.
 */
export function ThemeProvider({
  config,
  defaultPreference = "system",
  storageKey = "bo-theme",
  children,
}: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>(defaultPreference);
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useBeforePaint(() => {
    try {
      const saved = storageKey ? localStorage.getItem(storageKey) : null;
      if (isPreference(saved)) setPreferenceState(saved);
    } catch {
      /* storage unavailable: keep the default */
    }
    setReady(true);
  }, [storageKey]);

  useBeforePaint(() => {
    if (typeof matchMedia !== "function") return;
    const query = matchMedia(DARK_QUERY);
    const update = () => setDark(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const theme = preference === "system" ? (dark ? "dark" : "light") : preference;

  useBeforePaint(() => {
    applyTheme(document.documentElement, theme);
  }, [theme]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      try {
        if (storageKey) localStorage.setItem(storageKey, next);
      } catch {
        /* storage unavailable: the choice just isn't remembered */
      }
    },
    [storageKey],
  );

  const value = useMemo(
    () => ({ preference, theme, setPreference, ready }),
    [preference, theme, setPreference, ready],
  );
  return (
    <ThemeContext.Provider value={value}>
      <TamaguiProvider config={config} defaultTheme={theme}>
        {children}
      </TamaguiProvider>
    </ThemeContext.Provider>
  );
}

export interface ThemeToggleProps {
  /** See `LaunchListProps.locale`. */
  locale?: string;
  /** See `LaunchListProps.messages`. */
  messages?: Messages;
}

/** A button that steps through system, light and dark. */
export function ThemeToggle(props: ThemeToggleProps) {
  return (
    <WithLocale locale={props.locale} messages={props.messages}>
      <ThemeToggleBody />
    </WithLocale>
  );
}

function ThemeToggleBody() {
  const { m } = useI18n();
  const { preference, setPreference, ready } = useThemePreference();
  const current = m.theme.preferences[preference];
  return (
    <Button
      size="sm"
      // Hidden, but still taking its space, until the saved setting is known: the label would otherwise show the
      // default and then change.
      style={ready ? undefined : { visibility: "hidden" }}
      aria-label={m.theme.toggle(current)}
      onPress={() => setPreference(ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length]!)}
    >
      {current}
    </Button>
  );
}

/** `themeScript` as an element, for a client component or a page that is not a server component. */
export function ThemeScript({ storageKey = "bo-theme" }: { storageKey?: string }) {
  return <script dangerouslySetInnerHTML={{ __html: themeScript(storageKey) }} />;
}
