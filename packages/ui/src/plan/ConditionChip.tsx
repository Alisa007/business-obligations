import { useEffect, useState } from "react";
import { Text, XStack } from "tamagui";
import { useI18n } from "../i18n/context";
import { focusProfileField, hasProfileField } from "../profile/focus";
import { describeWhen } from "./ObligationCard";

/**
 * "Applies if number of employees: more than 0; …": each condition takes the visitor to the input that answers it
 * (`onEditField` replaces that for a host with its own form). A condition no input answers is plain text.
 */
export function ConditionChip({
  when,
  onEditField,
}: {
  when: Array<{ field: string; values: unknown[] }>;
  onEditField?: (field: string) => void;
}) {
  const { m } = useI18n();
  // The sentence has the conditions in it wherever the language puts them, so split it at a marker.
  const [before = "", after = ""] = m.appliesIf("\u0001").split("\u0001");
  const go = (field: string) => (onEditField ? onEditField(field) : focusProfileField(field));
  // Only a condition that has an input on this page is a link: that is known once the page is there to ask.
  const [linked, setLinked] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    setLinked(new Set(when.map((condition) => condition.field).filter(hasProfileField)));
  }, [when]);
  return (
    <XStack
      borderWidth={1}
      borderColor="amber-600"
      borderRadius="md"
      paddingHorizontal="2"
      paddingVertical="0.5"
      flexShrink={1}
      minWidth={0}
    >
      <Text fontSize="xs" flexShrink={1} color="amber-600">
        {before}
        {when.map((condition, index) => (
          <span key={condition.field}>
            {index ? "; " : ""}
            {onEditField || linked.has(condition.field) ? (
              <button
                type="button"
                onClick={() => go(condition.field)}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: 2,
                }}
              >
                {describeWhen(m, condition)}
              </button>
            ) : (
              describeWhen(m, condition)
            )}
          </span>
        ))}
        {after}
      </Text>
    </XStack>
  );
}
