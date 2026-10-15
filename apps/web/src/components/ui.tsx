"use client";

import type { ReactNode } from "react";
import { Anchor, Paragraph, Text, XStack, YStack } from "tamagui";
import { safeUrl } from "../lib/format";

/** An external link, or plain text when the URL is missing or not http(s). */
export function ExternalLink({ url, children }: { url?: string; children: ReactNode }) {
  const href = safeUrl(url);
  if (!href) return <Text>{children}</Text>;
  return (
    <Anchor
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      color="accent-background"
      textDecorationLine="underline"
    >
      {children}
    </Anchor>
  );
}

type Tone = "neutral" | "good" | "warn" | "bad" | "info";

const TONES = {
  neutral: { border: "border-color", color: "color" },
  good: { border: "green-600", color: "green-600" },
  warn: { border: "amber-600", color: "amber-600" },
  bad: { border: "red-600", color: "red-600" },
  info: { border: "accent-background", color: "accent-background" },
} as const satisfies Record<Tone, { border: string; color: string }>;

/** A small pill. `outline` pills show a coloured border and text; the default is a filled neutral chip. */
export function Chip({
  children,
  tone = "neutral",
  outline = false,
  title,
}: {
  children: ReactNode;
  tone?: Tone;
  outline?: boolean;
  title?: string;
}) {
  const t = TONES[tone];
  return (
    <XStack
      borderWidth={1}
      borderColor={outline ? t.border : "transparent"}
      backgroundColor={outline ? "transparent" : "color-2"}
      borderRadius="full"
      paddingHorizontal="2"
      paddingVertical="px"
      alignItems="center"
      {...(title ? { "aria-label": title } : {})}
    >
      <Text fontSize="xs" color={outline ? t.color : "color"}>
        {children}
      </Text>
    </XStack>
  );
}

/** A bordered panel on the page background. */
export function Panel({ children, ...rest }: { children: ReactNode } & Record<string, unknown>) {
  return (
    <YStack
      backgroundColor="background"
      borderWidth={1}
      borderColor="border-color"
      borderRadius="lg"
      padding="4"
      {...rest}
    >
      {children}
    </YStack>
  );
}

export function Muted({ children, size = "sm" }: { children: ReactNode; size?: "xs" | "sm" | "base" }) {
  return (
    <Paragraph fontSize={size} color="placeholder-color">
      {children}
    </Paragraph>
  );
}

/** Label above a control. */
export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <YStack gap="1">
      <label htmlFor={htmlFor} style={{ fontSize: 13, color: "var(--placeholder-color)" }}>
        {label}
      </label>
      {children}
    </YStack>
  );
}

/** The platform's own select: accessible, and the best control on phones. Styled from the theme variables. */
export function NativeSelect({
  id,
  value,
  onChange,
  options,
  label,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  label?: string;
}) {
  return (
    <select
      id={id}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid var(--border-color)",
        background: "var(--background)",
        color: "var(--color)",
        font: "inherit",
        fontSize: 14,
      }}
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
