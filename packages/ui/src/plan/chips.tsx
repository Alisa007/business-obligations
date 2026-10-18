import type { ComplianceItem } from "business-obligations";
import { useI18n } from "../i18n/context";
import { Chip } from "../shared/primitives";

export function Confidence({ item }: { item: ComplianceItem }) {
  const { m, date } = useI18n();
  const provenance = item.provenance;
  if (!provenance) return null;
  const label =
    provenance.confidence === "checked"
      ? m.checked(provenance.checkedOn ? date(provenance.checkedOn) : undefined)
      : provenance.confidence === "unconfirmed"
        ? m.partlyUnconfirmed
        : m.notIndividuallyChecked;
  const tone =
    provenance.confidence === "checked"
      ? "good"
      : provenance.confidence === "unconfirmed"
        ? "warn"
        : "neutral";
  return (
    <>
      <Chip outline tone={tone}>
        {label}
      </Chip>
      {provenance.stale && (
        <Chip outline tone="warn">
          {m.reviewOverdue}
        </Chip>
      )}
    </>
  );
}

export function Fee({ item }: { item: ComplianceItem }) {
  const { m, money } = useI18n();
  return item.cost?.amount !== undefined ? <Chip>{m.fee(money(item.cost.amount))}</Chip> : null;
}
