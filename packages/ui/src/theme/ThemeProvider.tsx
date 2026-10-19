import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, TamaguiProvider, Theme } from "tamagui";
import { WithLocale, useI18n } from "../i18n/context";
import type { Messages } from "../i18n/messages";

export type ThemePreference = "system" | "light" | "dark";

export interface ThemeState {
  /** What the visitor chose; "system" follows the device. */
  preference: ThemePreference;
  /** The theme in use. */
  theme: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
}

const ORDER: ThemePreference[] = ["system", "light", "dark"];
const DARK_QUERY = "(prefers-color-scheme: dark)";
const ThemeContext = /* @__PURE__ */ createContext<ThemeState>({
  preference: "system",
  theme: "light",
  setPreference: () => {},
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
 * `TamaguiProvider` with light, dark and "follow the device". The first render, on the server too, is light; the
 * remembered or device setting applies right after hydration, so the HTML and the first client render agree.
 */
export function ThemeProvider({
  config,
  defaultPreference = "system",
  storageKey = "bo-theme",
  children,
}: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>(defaultPreference);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      const saved = storageKey ? localStorage.getItem(storageKey) : null;
      if (isPreference(saved)) setPreferenceState(saved);
    } catch {
      /* storage unavailable: keep the default */
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const query = matchMedia(DARK_QUERY);
    const update = () => setDark(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const theme = preference === "system" ? (dark ? "dark" : "light") : preference;

  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
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

  const value = useMemo(() => ({ preference, theme, setPreference }), [preference, theme, setPreference]);
  return (
    <ThemeContext.Provider value={value}>
      <TamaguiProvider config={config} defaultTheme={theme}>
        <Theme name={theme}>{children}</Theme>
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
  const { preference, setPreference } = useThemePreference();
  const current = m.theme.preferences[preference];
  return (
    <Button
      size="sm"
      aria-label={m.theme.toggle(current)}
      onPress={() => setPreference(ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length]!)}
    >
      {current}
    </Button>
  );
}
