import { useRef, useState } from "react";
import { Popover, Text } from "tamagui";

/**
 * A small "?" next to a label that explains what the field is for. It opens on hover, on focus and on a tap, so it
 * works with a mouse, the keyboard and a touch screen, and it moves aside when it would not fit.
 */
export function InfoTip({ label, children }: { label: string; children: string }) {
  const [open, setOpen] = useState(false);
  // A click on the "?" while the pointer is on it (it opened on hover) must not toggle the tip shut again.
  const hovered = useRef(false);
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next || !hovered.current) setOpen(next);
      }}
      placement="top-start"
      allowFlip
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          onMouseEnter={() => {
            hovered.current = true;
            setOpen(true);
          }}
          onMouseLeave={() => {
            hovered.current = false;
            setOpen(false);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            padding: 0,
            border: 0,
            borderRadius: 10,
            background: "transparent",
            color: open ? "var(--color)" : "var(--placeholder-color)",
            cursor: "help",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6.75" stroke="currentColor" strokeWidth="1.25" />
            <path
              d="M6.1 6.3a1.95 1.95 0 1 1 2.75 1.78c-.55.27-.85.68-.85 1.27"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
            <circle cx="8" cy="11.55" r=".85" fill="currentColor" />
          </svg>
        </button>
      </Popover.Trigger>
      <Popover.Content
        borderWidth={1}
        borderColor="border-color"
        backgroundColor="background"
        padding="2.5"
        maxWidth={260}
      >
        <Text fontSize="sm">{children}</Text>
      </Popover.Content>
    </Popover>
  );
}
