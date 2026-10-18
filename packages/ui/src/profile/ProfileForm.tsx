import { useEffect, useId, useRef, type ReactNode } from "react";
import { LLC_TAX_CLASSIFICATIONS, PROFESSIONS } from "business-obligations";
import { Text } from "tamagui";
import { WithLocale, useI18n } from "../i18n/context";
import { todayIso } from "../i18n/format";
import type { Messages } from "../i18n/messages";
import { DETAIL_FIELDS, type ProfileChoices } from "./choices";
import { ChoiceField } from "./fields/ChoiceField";
import { DateField } from "./fields/DateField";
import { DetailsField } from "./fields/DetailsField";
import { IndustryField } from "./fields/IndustryField";
import { EmployeesField, NumberControl } from "./fields/NumberField";
import { TypeField } from "./fields/TypeField";
import { ZipField } from "./fields/ZipField";
import { needsProfession } from "./place";
import { ProfileQueryProvider, useFixedChoices, useProfileChoices, type ProfileValues } from "./store";

/** A small uppercase heading with a rule after it, which groups the fields below. It takes the full width. */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="bo-full bo-section">
      <Text
        fontSize="xs"
        fontWeight="700"
        letterSpacing={1}
        textTransform="uppercase"
        color="placeholder-color"
      >
        {children}
      </Text>
      <div className="bo-rule" />
    </div>
  );
}

/**
 * The layout follows the width of the form itself (container queries), not of the window: two columns in a narrow
 * sidebar, four in a panel, six in a wide area. A `wide` field (text, lists, long labels) takes two columns, a `short`
 * one (a count or a date) one, or two on the widest layout; headings and the yes/no details take them all. The form is as wide as the element it is put in (the host sets that width). The first group has no heading: the form needs no title to say what it starts with.
 */
const FORM_CSS = `
/* container-type makes the width independent of the content, so the form takes the width it is given */
.bo-form{container-type:inline-size;width:100%;min-width:0}
.bo-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:12px;row-gap:14px;align-items:start}
.bo-grid>*{min-width:0}
.bo-wide{grid-column:span 2}
.bo-full{grid-column:1/-1}
.bo-section{display:flex;align-items:center;gap:10px;margin-top:10px}
.bo-section:first-child{display:none}
.bo-rule{flex:1;height:1px;background:var(--border-color)}
@container (min-width:520px){.bo-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
@container (min-width:800px){.bo-grid{grid-template-columns:repeat(6,minmax(0,1fr))}.bo-short{grid-column:span 2}}
`;

/** One field in the grid; see `FORM_CSS`. */
function Cell({ size = "wide", children }: { size?: "wide" | "short"; children: ReactNode }) {
  return <div className={size === "wide" ? "bo-wide" : "bo-short"}>{children}</div>;
}

/** Something that takes every column of the grid. */
function Full({ children }: { children: ReactNode }) {
  return <div className="bo-full">{children}</div>;
}

export interface ProfileFormProps {
  /** See `LaunchListProps.locale`. */
  locale?: string;
  /** See `LaunchListProps.messages`. */
  messages?: Messages;
  /**
   * Answers the host already has, for example the ZIP code on a page for one city, or its `city`, `county` and `state`. Each replaces what the address
   * says and its field is not shown. To read the same values outside the form, give them to `ProfileQueryProvider`,
   * which the form picks up.
   */
  values?: ProfileValues;
  /** Today's date as `YYYY-MM-DD`, for the "start" date and the limits of the calendars. Defaults to the local date. */
  today?: string;
  /** Called with the name of a choice (never its value) when the person changes it. */
  onFieldUsed?: (field: keyof ProfileChoices) => void;
}

function ProfileFormBody({ today, onFieldUsed }: Pick<ProfileFormProps, "today" | "onFieldUsed">) {
  const { m, tag } = useI18n();
  const f = m.profileForm;
  const prefix = useId();
  const [choices, set] = useProfileChoices();
  const fixed = useFixedChoices();
  const now = today ?? todayIso();
  const asOf = choices.asOf || now;

  // Tell the host which choice changed (never to what). The first render is not a change.
  const before = useRef<ProfileChoices | undefined>(undefined);
  useEffect(() => {
    const previous = before.current;
    before.current = choices;
    if (!previous || !onFieldUsed) return;
    for (const key of Object.keys(choices) as (keyof ProfileChoices)[])
      if (!Object.is(previous[key], choices[key])) onFieldUsed(key);
  }, [choices, onFieldUsed]);

  const shows = (...keys: (keyof ProfileChoices)[]) => keys.some((key) => !fixed.has(key));
  const monthName = (month: number) => {
    const name = new Intl.DateTimeFormat(tag, { month: "long", timeZone: "UTC" }).format(
      new Date(Date.UTC(2023, month, 1)),
    );
    return name.charAt(0).toLocaleUpperCase(tag) + name.slice(1);
  };
  const askProfession = shows("profession") && needsProfession(choices);
  const askLlcTax = shows("llcTaxClassification") && ["", "llc", "pllc"].includes(choices.entityType ?? "");
  const askDetails = shows("isFormed", ...DETAIL_FIELDS);

  return (
    <div className="bo-grid">
      {(shows("zip", "entityType", "naics") || askProfession) && <SectionLabel>{f.business}</SectionLabel>}
      {shows("zip") && (
        <Cell>
          <ZipField id={`${prefix}-zip`} />
        </Cell>
      )}
      {shows("entityType") && (
        <Cell>
          <TypeField />
        </Cell>
      )}
      {shows("naics") && (
        <Full>
          <IndustryField />
        </Full>
      )}
      {askProfession && (
        <Cell>
          <ChoiceField
            id={`${prefix}-profession`}
            label={f.profession}
            value={choices.profession ?? ""}
            blank={f.professionPlaceholder}
            options={PROFESSIONS.map((profession) => [profession, f.professions[profession]])}
            onChange={(value) => set({ profession: (value || undefined) as ProfileChoices["profession"] })}
          />
        </Cell>
      )}

      {shows("employeeCount", "ownerCount", "fullTimeEmployeeCount") && <SectionLabel>{f.size}</SectionLabel>}
      {shows("employeeCount") && (
        <Cell size="short">
          <EmployeesField placeholder="0" />
        </Cell>
      )}
      {shows("ownerCount") && (
        <Cell size="short">
          <NumberControl
            id={`${prefix}-owners`}
            field="ownerCount"
            label={f.owners}
            placeholder={f.ownersPlaceholder}
            kind="owners"
          />
        </Cell>
      )}
      {shows("fullTimeEmployeeCount") && (
        <Cell>
          <NumberControl
            id={`${prefix}-fullTime`}
            field="fullTimeEmployeeCount"
            label={f.fullTime}
            placeholder={f.fullTimePlaceholder}
            kind="employees"
          />
        </Cell>
      )}

      {shows(
        "annualPayroll",
        "annualRevenue",
        "annualNetIncome",
        "largestContractorPaymentUsd",
        "priorYearPayrollTaxLiability",
      ) && <SectionLabel>{f.money}</SectionLabel>}
      {(
        [
          ["annualPayroll", f.payroll],
          ["annualRevenue", f.revenue],
          ["annualNetIncome", f.netIncome],
          ["largestContractorPaymentUsd", f.contractor],
          ["priorYearPayrollTaxLiability", f.priorTax],
        ] as const
      ).map(
        ([field, label]) =>
          shows(field) && (
            <Cell key={field}>
              <NumberControl
                id={`${prefix}-${field}`}
                field={field}
                label={label}
                placeholder={f.optional}
                kind="amount"
                prefix="$"
              />
            </Cell>
          ),
      )}

      {(shows("fiscalYearEndMonth") || askLlcTax) && <SectionLabel>{f.tax}</SectionLabel>}
      {shows("fiscalYearEndMonth") && (
        <Cell>
          <ChoiceField
            id={`${prefix}-fiscalMonth`}
            label={f.fiscalMonth}
            value={choices.fiscalYearEndMonth === undefined ? "" : String(choices.fiscalYearEndMonth)}
            blank={f.calendarYear}
            options={Array.from({ length: 11 }, (_, month) => [String(month + 1), monthName(month)])}
            onChange={(value) => set({ fiscalYearEndMonth: value ? Number(value) : undefined })}
          />
        </Cell>
      )}
      {askLlcTax && (
        <Cell>
          <ChoiceField
            id={`${prefix}-llcTax`}
            label={f.llcTax}
            value={choices.llcTaxClassification ?? ""}
            blank={f.notSure}
            options={LLC_TAX_CLASSIFICATIONS.map((kind) => [kind, f.llcTaxClassifications[kind]])}
            onChange={(value) =>
              set({ llcTaxClassification: (value || undefined) as ProfileChoices["llcTaxClassification"] })
            }
          />
        </Cell>
      )}

      {askDetails && <SectionLabel>{m.profile.details}</SectionLabel>}
      <Full>
        <DetailsField legend={false} />
      </Full>

      {(shows("asOf", "openingDate") || (choices.isFormed && shows("formationDate"))) && (
        <SectionLabel>{f.dates}</SectionLabel>
      )}
      {choices.isFormed && shows("formationDate") && (
        <Cell size="short">
          <DateField
            id={`${prefix}-formationDate`}
            label={f.formationDate}
            value={choices.formationDate}
            onChange={(value) => set({ formationDate: value })}
            max={asOf}
          />
        </Cell>
      )}
      {shows("asOf") && (
        <Cell size="short">
          <DateField
            id={`${prefix}-asOf`}
            label={f.startToday}
            value={asOf}
            onChange={(value) => set({ asOf: value === now ? "" : value })}
          />
        </Cell>
      )}
      {shows("openingDate") && (
        <Cell size="short">
          <DateField
            id={`${prefix}-openingDate`}
            label={f.targetOpening}
            value={choices.openingDate}
            onChange={(value) => set({ openingDate: value })}
            min={asOf}
            clearable
          />
        </Cell>
      )}
    </div>
  );
}

/**
 * Everything a person can tell about their business, in one form: where it is (ZIP code), what it is (type,
 * industry, profession), how big (people, money), how it is taxed, yes/no details, and the dates of the plan. The
 * answers live in the address bar (see `useProfileChoices`), so a link shares the whole form. Nothing is submitted:
 * a host that reads the choices sees every change.
 *
 * Pass `values` for what the host already knows, and those fields are left out.
 */
export function ProfileForm({ locale, messages, values, today, onFieldUsed }: ProfileFormProps) {
  const body = <ProfileFormBody today={today} onFieldUsed={onFieldUsed} />;
  return (
    <WithLocale locale={locale} messages={messages}>
      {/* Nothing is submitted, but Enter in a field must not reload the page. */}
      <form className="bo-form" onSubmit={(event) => event.preventDefault()}>
        <style>{FORM_CSS}</style>
        {values ? <ProfileQueryProvider values={values}>{body}</ProfileQueryProvider> : body}
      </form>
    </WithLocale>
  );
}
