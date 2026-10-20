// The public API of business-obligations-ui. Everything is exported by name from here, and nothing in a module runs
// when it loads, so a bundler keeps only what an app imports.

// Language, and the one set of formatters (also for hosts that show amounts and dates of their own)
export { messages, getMessages } from "./i18n/messages";
export type { Locale, Messages } from "./i18n/messages";
export { formatDate, formatMoney, relativeDays, todayIso } from "./i18n/format";

// Small pieces the lists are made of, for hosts that lay out results themselves
export { Chip, ExternalLink, Stat } from "./shared/primitives";
export { Collapse, type CollapseProps } from "./shared/Collapse";
export { Select, type SelectOption, type SelectProps } from "./shared/Select";
export { safeUrl } from "./shared/url";
export { useBeforePaint, useHydrated } from "./shared/hooks";

// Launch plan and obligations
export { LaunchList } from "./plan/LaunchList";
export type { LaunchListProps } from "./plan/LaunchList";
export { PlanSummary } from "./plan/PlanSummary";
export type { PlanSummaryProps } from "./plan/PlanSummary";
export { ObligationsSummary } from "./plan/ObligationsSummary";
export type { ObligationsSummaryProps } from "./plan/ObligationsSummary";
export { ObligationsList } from "./plan/ObligationsList";
export type { ConditionalItem, ObligationsListProps } from "./plan/ObligationsList";
export { NO_OBLIGATION_FILTERS, filterObligations } from "./plan/filters";
export type { ObligationFilters } from "./plan/filters";
export { isVerified } from "./plan/items";
export type { ComplianceItem, LaunchPlan } from "business-obligations";

// Page layout
export { SidebarLayout } from "./layout/SidebarLayout";
export type { SidebarLayoutProps } from "./layout/SidebarLayout";

// What is specific to the smallest place chosen
export { LocationSummary } from "./summary/LocationSummary";
export type { LocationSummaryProps } from "./summary/LocationSummary";

// Calendar of deadlines
export { CalendarList } from "./calendar/CalendarList";
export type { CalendarListProps } from "./calendar/CalendarList";
export { CalendarDownload } from "./calendar/CalendarDownload";
export type { CalendarDownloadProps } from "./calendar/CalendarDownload";
export type { CalendarEvent } from "business-obligations";

// Light, dark and follow-the-device
export { ThemeProvider, ThemeScript, ThemeToggle, useThemePreference } from "./theme/ThemeProvider";
export type {
  ThemePreference,
  ThemeProviderProps,
  ThemeState,
  ThemeToggleProps,
} from "./theme/ThemeProvider";

// The business profile: the choices, where they live (the address), and the fields that edit them
export {
  DETAIL_FIELDS,
  NUMBER_FIELDS,
  PROFILE_DEFAULTS,
  PROFILE_PARAMS,
  hasLegacyParams,
  readProfileQuery,
  writeProfileQuery,
} from "./profile/choices";
export type { DetailField, NumberField, ProfileChoices } from "./profile/choices";
export {
  PROFILE_QUERY_EVENT,
  ProfileQueryProvider,
  setProfileQuery,
  useFixedChoices,
  useProfileChoices,
  useProfilePlace,
} from "./profile/store";
export type { ProfileValues } from "./profile/store";
export { focusProfileField, hasProfileField } from "./profile/focus";
export { lookupPlace, needsProfession, profileFromChoices } from "./profile/place";
export type { Place } from "./profile/place";
export { ProfileForm } from "./profile/ProfileForm";
export type { ProfileFormProps } from "./profile/ProfileForm";
export { TypeField } from "./profile/fields/TypeField";
export { IndustryField } from "./profile/fields/IndustryField";
export { EmployeesField } from "./profile/fields/NumberField";
export { DetailsField } from "./profile/fields/DetailsField";
export type { DetailsFieldProps } from "./profile/fields/DetailsField";
export type { ProfileFieldProps } from "./profile/fields/controls";
