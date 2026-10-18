import { Label, Text, YStack } from "tamagui";
import { useI18n } from "../../i18n/context";
import type { Messages } from "../../i18n/messages";
import type { FieldError } from "../validation";

/** Props every business-details field takes. The value itself lives in the URL, so there is no `value` or `onChange`. */
export interface ProfileFieldProps {
  /** See `LaunchListProps.locale`. */
  locale?: string;
  /** See `LaunchListProps.messages`. */
  messages?: Messages;
  /** `id` of the control. Generated when left out. */
  id?: string;
}

export function Labeled({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <YStack gap="1" flexGrow={1}>
      <Label htmlFor={id} fontSize="sm" fontWeight="500" color="color">
        {label}
      </Label>
      {children}
    </YStack>
  );
}

/** What is wrong with a field, in red under it. Its `id` goes in the control's `aria-describedby`. */
export function ErrorText({ id, error }: { id: string; error: FieldError }) {
  const { m } = useI18n();
  return (
    <Text id={id} role="alert" fontSize="sm" color="red-600">
      {m.profile.errors[error]}
    </Text>
  );
}

/** Border colour of a control: red while it has an error. */
export const borderOf = (error: FieldError | undefined) => (error ? "red-600" : "border-color");

export { ClearButton } from "../../shared/ClearButton";
