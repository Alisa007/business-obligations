import type { ReactNode } from "react";
import { Anchor, Text, XStack, YStack } from "tamagui";
import { isGovernmentUrl, safeUrl } from "./url";

export function ExternalLink({ url, children }: { url?: string | string[]; children: ReactNode }) {
  const href = safeUrl(Array.isArray(url) ? url[0] : url);
  return href ? (
    <Anchor
      href={href}
      target="_blank"
      rel={isGovernmentUrl(href) ? "noopener noreferrer" : "nofollow noopener noreferrer"}
      color="accent-background"
      textDecorationLine="underline"
      textAlign="left"
    >
      {children}
    </Anchor>
  ) : (
    <Text>{children}</Text>
  );
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <YStack flexBasis={150} flexGrow={1} backgroundColor="color-2" borderRadius="md" padding="3" gap="0.5">
      <Text fontSize="xs" color="placeholder-color">
        {label}
      </Text>
      <Text fontSize="xl" fontWeight="600">
        {value}
      </Text>
      {note && (
        <Text fontSize="sm" color="placeholder-color">
          {note}
        </Text>
      )}
    </YStack>
  );
}

export function Chip({
  children,
  tone = "neutral",
  outline = false,
  title,
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
  outline?: boolean;
  title?: string;
}) {
  const color = {
    neutral: "color",
    good: "green-600",
    warn: "amber-600",
    bad: "red-600",
    info: "accent-background",
  }[tone];
  return (
    <XStack
      borderWidth={1}
      borderColor={outline ? color : "transparent"}
      backgroundColor={outline ? "transparent" : "color-2"}
      borderRadius="md"
      paddingHorizontal="2"
      paddingVertical="0.5"
      // a long text wraps inside the chip instead of pushing it past the screen
      flexShrink={1}
      minWidth={0}
      {...(title ? { "aria-label": title } : {})}
    >
      <Text fontSize="xs" flexShrink={1} color={outline ? color : "color"}>
        {children}
      </Text>
    </XStack>
  );
}
