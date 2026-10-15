"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  Accordion,
  Anchor,
  Checkbox,
  Input,
  Label,
  Paragraph,
  Separator,
  Text,
  XStack,
  YStack,
  useMedia,
} from "tamagui";
import { safeUrl } from "../lib/format";

/** Touch-sized controls on phones (16px text also stops iOS zooming on focus); compact from the md breakpoint up. */
export function useControlProps() {
  const compact = useMedia().md;
  return { height: compact ? 36 : 44, fontSize: compact ? 14 : 16 } as const;
}

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

/** A small label. `outline` chips show a coloured border and text; the default is a filled neutral chip. */
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
      borderRadius="md"
      paddingHorizontal="2"
      paddingVertical="0.5"
      alignItems="center"
      maxWidth="100%"
      flexShrink={1}
      {...(title ? { "aria-label": title } : {})}
    >
      <Text fontSize="xs" flexShrink={1} color={outline ? t.color : "color"}>
        {children}
      </Text>
    </XStack>
  );
}

/** A bordered panel on the page background. */
export function Panel({ children, ...rest }: ComponentProps<typeof YStack>) {
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

/** A small uppercase heading that groups related form fields. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text
      fontSize="xs"
      fontWeight="700"
      letterSpacing={1}
      textTransform="uppercase"
      color="placeholder-color"
    >
      {children}
    </Text>
  );
}

/** A figure with a caption, in a tinted card; lay several out in a wrapping XStack. */
export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <YStack flexBasis={150} flexGrow={1} backgroundColor="color-2" borderRadius="md" padding="3" gap="0.5">
      <Muted size="xs">{label}</Muted>
      <Text fontSize="xl" fontWeight="600">
        {value}
      </Text>
      {note ? (
        <Text fontSize="sm" color="placeholder-color">
          {note}
        </Text>
      ) : null}
    </YStack>
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

/**
 * A collapsible section on Tamagui's `Accordion` (one item per instance, so sections open and close
 * independently). `card` frames it as a bordered card; otherwise it is a flat row with a hairline above.
 */
export function Disclosure({
  summary,
  open = false,
  card = false,
  children,
}: {
  summary: ReactNode;
  open?: boolean;
  card?: boolean;
  children: ReactNode;
}) {
  return (
    <Accordion
      type="multiple"
      defaultValue={open ? ["item"] : []}
      {...(card
        ? { borderWidth: 1, borderColor: "border-color", borderRadius: "lg", overflow: "hidden" }
        : { borderTopWidth: 1, borderColor: "border-color" })}
    >
      <Accordion.Item value="item">
        <Accordion.Header>
          <Accordion.Trigger
            flexDirection="row"
            alignItems="flex-start"
            gap="2.5"
            paddingVertical="3"
            paddingHorizontal={card ? "3" : "0"}
            backgroundColor="transparent"
            borderWidth={0}
            cursor="pointer"
          >
            {({ open: isOpen }: { open: boolean }) => (
              <>
                <Text color="placeholder-color" width={14} marginTop={2} rotate={isOpen ? "90deg" : "0deg"}>
                  ▸
                </Text>
                <YStack flex={1} minWidth={0}>
                  {summary}
                </YStack>
              </>
            )}
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content
          backgroundColor="transparent"
          paddingTop="0"
          paddingBottom="3"
          paddingLeft={card ? "3" : "0"}
          paddingRight={card ? "3" : "0"}
        >
          <YStack paddingLeft="6">{children}</YStack>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

/** Label above a control. */
export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <YStack gap="0.5" minWidth={0}>
      <Label htmlFor={htmlFor} fontSize="sm" color="placeholder-color">
        {label}
      </Label>
      {children}
    </YStack>
  );
}

/** Two fields side by side, sharing the width equally (each is a column of its own, so heights are unaffected). */
export function Pair({ children }: { children: [ReactNode, ReactNode] }) {
  return (
    <XStack gap="3">
      {children.map((child, n) => (
        <YStack key={n} flex={1} minWidth={0}>
          {child}
        </YStack>
      ))}
    </XStack>
  );
}

/** A labelled text input sized for touch (16px stops iOS zooming on focus). */
export function TextField({
  id,
  label,
  value,
  onChange,
  inputMode,
  maxLength,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "numeric";
  maxLength?: number;
  hint?: ReactNode;
}) {
  const controlProps = useControlProps();
  return (
    <Field label={label} htmlFor={id}>
      <Input
        id={id}
        value={value}
        onChangeText={onChange}
        {...controlProps}
        autoComplete="off"
        {...(inputMode ? { inputMode } : {})}
        {...(maxLength ? { maxLength } : {})}
      />
      {hint}
    </Field>
  );
}

/** A checkbox with a label that is itself a full-width tap target. */
export function CheckField({
  id,
  label,
  checked,
  onChange,
  children,
}: {
  id: string;
  label?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Rich label content; replaces `label`. */
  children?: ReactNode;
}) {
  return (
    <XStack gap="3" alignItems="flex-start" paddingVertical="1" opacity={checked && children ? 0.6 : 1}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        size="md"
        marginTop="0.5"
      >
        <Checkbox.Indicator>
          <Text fontSize="xs">✓</Text>
        </Checkbox.Indicator>
      </Checkbox>
      {children ? (
        <YStack flex={1} minWidth={0}>
          {children}
        </YStack>
      ) : (
        <Label htmlFor={id} flex={1} fontSize="base">
          {label}
        </Label>
      )}
    </XStack>
  );
}

/** Style for native form controls (select, date) so they match the Tamagui inputs; follows the theme. */
const nativeControl = (compact: boolean) =>
  ({
    width: "100%",
    minHeight: compact ? 36 : 44,
    padding: compact ? "4px 8px" : "8px 10px",
    borderRadius: 8,
    border: "1px solid var(--border-color)",
    background: "var(--background)",
    color: "var(--color)",
    font: "inherit",
    fontSize: compact ? 14 : 16,
  }) as const;

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
  const compact = useMedia().md;
  return (
    <select
      id={id}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={nativeControl(compact)}
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
