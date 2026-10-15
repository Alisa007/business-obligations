"use client";

import type { ReactNode } from "react";
import { NextThemeProvider, useRootTheme } from "@tamagui/next-theme";
import { TamaguiProvider } from "tamagui";
import tamaguiConfig from "../tamagui.config";

export function NextTamaguiProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useRootTheme();

  return (
    <NextThemeProvider skipNextHead onChangeTheme={(next) => setTheme(next as "light" | "dark")}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme={theme}>
        {children}
      </TamaguiProvider>
    </NextThemeProvider>
  );
}
