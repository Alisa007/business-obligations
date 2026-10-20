import "../public/tamagui.generated.css";
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { themeScript } from "business-obligations-ui/theme-script";
import { NextTamaguiProvider } from "./NextTamaguiProvider";

export const metadata: Metadata = {
  title: "Business obligations playground",
  description:
    "Describe a US business and get the licenses, permits, filings and deadlines that apply, in order. The plan is computed in your browser.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript() }} />
      </head>
      <body>
        <NextTamaguiProvider>{children}</NextTamaguiProvider>
      </body>
    </html>
  );
}
