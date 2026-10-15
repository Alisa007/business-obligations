import "../public/tamagui.generated.css";
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NextTamaguiProvider } from "./NextTamaguiProvider";

export const metadata: Metadata = {
  title: "Compliance rules engine playground",
  description:
    "Describe a US business and get the licenses, permits, filings and deadlines that apply, in order. The plan is computed in your browser.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <NextTamaguiProvider>{children}</NextTamaguiProvider>
      </body>
    </html>
  );
}
