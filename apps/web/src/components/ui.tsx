"use client";

import type { ComponentProps, ReactNode } from "react";
import { Paragraph, Separator, Text, XStack, YStack } from "tamagui";

/** A bordered panel on the page background. */
export function Panel({ children, ...rest }: ComponentProps<typeof YStack>) {
  return (
    <YStack
      backgroundColor="background"
      borderWidth={1}
      borderColor="border-color"
      borderRadius="lg"
      boxSizing="border-box"
      minWidth={0}
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

/** A row in a list: a hairline above it, and children that wrap onto further lines on narrow screens. */
export function ListRow({ children, ...rest }: ComponentProps<typeof XStack>) {
  return (
    <>
      <Separator />
      <XStack gap="3" paddingVertical="2" flexWrap="wrap" {...rest}>
        {children}
      </XStack>
    </>
  );
}

/** Label/value pairs; each pair wraps to a stacked layout when there is no room beside the label. */
export function DefinitionList({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <YStack gap="2">
      {items.map(([label, value]) => (
        <XStack key={label} gap="1" columnGap="4" flexWrap="wrap">
          <Text fontSize="sm" fontWeight="600" width={130}>
            {label}
          </Text>
          <Text fontSize="sm" flex={1} flexBasis={200}>
            {value}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}
