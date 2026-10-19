"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "business-obligations-ui";
import tamaguiConfig from "../tamagui.config";

export function NextTamaguiProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider config={tamaguiConfig}>{children}</ThemeProvider>;
}
