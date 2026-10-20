import type { ReactNode } from "react";
import { XStack, YStack } from "tamagui";

export interface SidebarLayoutProps {
  /** What stays in view at the left while the page scrolls: the business details form, or filters. */
  rail: ReactNode;
  /** The page's content, to the right of the rail (below it on a phone). */
  children: ReactNode;
  /** Name of the rail for screen readers. */
  railLabel?: string;
  /** Width of the rail from the `md` breakpoint up, in px. */
  railWidth?: number;
  /** The widest the content gets, in px. */
  contentWidth?: number;
  /** The narrowest the content is made to be by the room kept at the right, in px. */
  minContentWidth?: number;
  /** Make the layout at least as tall as the screen, so the rail's border runs to the bottom of a short page. */
  fillScreen?: boolean;
  /** Where the rail stops under the top of the screen while it scrolls, in px; for a header that stays in view. */
  stickyTop?: number;
}

/**
 * A rail at the left and the page's content beside it, which is the page layout of the playground. The rail is as
 * tall as the page, so its border runs to the bottom, and what is in it stays in view while the page scrolls. From
 * the `md` breakpoint up, as much room is kept at the right as the rail takes at the left, when the window is wide
 * enough to spare it (the content keeps at least `minContentWidth`), and the content is centered in what is left,
 * so it is not pushed against the rail on a wide screen. Below `md` the rail goes above the content.
 */
export function SidebarLayout({
  rail,
  children,
  railLabel,
  railWidth = 420,
  contentWidth = 1100,
  minContentWidth = 760,
  fillScreen = true,
  stickyTop = 0,
}: SidebarLayoutProps) {
  const mirror = `clamp(0px, calc(100vw - ${railWidth + minContentWidth}px), ${railWidth}px)`;
  return (
    <XStack
      flexDirection={{ default: "column", md: "row" }}
      alignItems={{ default: "stretch", md: "flex-start" }}
      width="100%"
      minHeight={fillScreen ? "100vh" : undefined}
    >
      <YStack
        render="aside"
        aria-label={railLabel}
        width={{ default: "100%", md: railWidth }}
        flexShrink={0}
        alignSelf="stretch"
        borderBottomWidth={{ default: 1, md: 0 }}
        borderRightWidth={{ default: 0, md: 1 }}
        borderColor="border-color"
        boxSizing="border-box"
      >
        <YStack position={{ default: "relative", md: "sticky" }} top={stickyTop} padding="3.5" gap="3">
          {rail}
        </YStack>
      </YStack>
      <YStack flex={1} minWidth={0} paddingRight={{ default: 0, md: mirror }}>
        <YStack
          width="100%"
          maxWidth={contentWidth}
          marginHorizontal="auto"
          boxSizing="border-box"
          paddingHorizontal="4"
          paddingVertical="6"
          gap="5"
        >
          {children}
        </YStack>
      </YStack>
    </XStack>
  );
}
