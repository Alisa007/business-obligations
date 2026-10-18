import { useId, useState, type ReactNode } from "react";
import { XStack, YStack } from "tamagui";

/** Turns with its item: a quarter turn from pointing right on the left, a half turn from pointing down on the right. */
function Chevron({ open, side }: { open: boolean; side: "left" | "right" }) {
  const turn = side === "left" ? (open ? 0 : -90) : open ? 180 : 0;
  return (
    // a plain element with an inline transition, so it turns whatever animation setup the host has
    <div
      aria-hidden
      style={{
        display: "flex",
        flexShrink: 0,
        marginTop: side === "left" ? 2 : 0,
        color: side === "left" ? "var(--placeholder-color)" : "var(--color)",
        transform: `rotate(${turn}deg)`,
        transition: "transform 220ms ease-out",
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

export interface CollapseProps {
  /** Always visible; the whole row opens and closes the content. */
  summary: ReactNode;
  children: ReactNode;
  /** Whether it starts open. */
  defaultOpen?: boolean;
  /** Which side of the summary the chevron is on. On the left the content lines up under the summary. */
  icon?: "left" | "right";
  /** Inside a bordered, rounded box (the lists) instead of a line above it. */
  card?: boolean;
  /** Heading level of the trigger's wrapper, so the page keeps a single h1. */
  level: 2 | 3;
  /** Called with the new state when it is opened or closed. */
  onOpenChange?: (open: boolean) => void;
}

/** A row that opens to show more, with a chevron that turns. Opens and closes with a CSS height transition. */
export function Collapse({
  summary,
  children,
  defaultOpen = false,
  icon = "left",
  card = false,
  level,
  onOpenChange,
}: CollapseProps) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const left = icon === "left";
  const gutter = card ? "3" : left ? "0" : "4";
  const toggle = () => {
    setOpen(!open);
    onOpenChange?.(!open);
  };
  return (
    <YStack
      {...(card
        ? { borderWidth: 1, borderColor: "border-color", borderRadius: "lg", overflow: "hidden" }
        : { borderTopWidth: 1, borderColor: "border-color" })}
    >
      <YStack render={`h${level}`} margin={0}>
        <XStack
          render="button"
          // not a submit button when inside a form
          {...({ type: "button" } as object)}
          aria-expanded={open}
          aria-controls={bodyId}
          onPress={toggle}
          alignItems={left ? "flex-start" : "center"}
          justifyContent={left ? "flex-start" : "space-between"}
          gap="2.5"
          paddingVertical="3"
          paddingHorizontal={gutter}
          width="100%"
          alignSelf="stretch"
          textAlign="left"
          backgroundColor="transparent"
          borderWidth={0}
          cursor="pointer"
        >
          {left && <Chevron open={open} side="left" />}
          <YStack flex={1} minWidth={0} alignItems="flex-start" alignSelf="stretch" textAlign="left">
            {summary}
          </YStack>
          {!left && <Chevron open={open} side="right" />}
        </XStack>
      </YStack>
      {/* A grid row that goes from 0fr to 1fr animates to the content's own height, whatever it is. */}
      <div
        id={bodyId}
        role="region"
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 220ms ease-out, visibility 0s linear",
          transitionDelay: open ? "0s" : "0s, 220ms",
          // closed content cannot be tabbed to, once it has finished closing
          visibility: open ? "visible" : "hidden",
        }}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <YStack paddingBottom="3" paddingHorizontal={gutter}>
            <YStack paddingLeft={left ? "6" : 0}>{children}</YStack>
          </YStack>
        </div>
      </div>
    </YStack>
  );
}
