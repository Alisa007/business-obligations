import { useId } from "react";
import { ENTITY_TYPES, type EntityType } from "business-obligations";
import { WithLocale, useI18n } from "../../i18n/context";
import { Select } from "../../shared/Select";
import { useFixedChoices, useProfileChoices } from "../store";
import { Labeled, type ProfileFieldProps } from "./controls";

function TypeControl({ id }: { id: string }) {
  const { m } = useI18n();
  const [choices, set] = useProfileChoices();
  return (
    <Labeled id={id} label={m.profile.entityType}>
      <Select
        id={id}
        value={choices.entityType ?? ""}
        options={ENTITY_TYPES.map((type) => ({ value: type, label: m.profile.entityTypes[type] }))}
        placeholder={m.profile.entityTypePlaceholder}
        clearLabel={m.profile.clear}
        onChange={(type) => set({ entityType: type as EntityType })}
        onClear={() => set({ entityType: undefined })}
      />
    </Labeled>
  );
}

/** The type of business (LLC, S corporation, ...), from the engine's `ENTITY_TYPES`. Reads and writes `?type=`. */
export function TypeField({ locale, messages, id }: ProfileFieldProps) {
  const generated = useId();
  if (useFixedChoices().has("entityType")) return null;
  return (
    <WithLocale locale={locale} messages={messages}>
      <TypeControl id={id ?? generated} />
    </WithLocale>
  );
}
