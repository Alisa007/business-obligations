import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { LLC_TAX_CLASSIFICATIONS, PROFESSIONS } from "business-obligations";
import { Text } from "tamagui";
import { WithLocale, useI18n } from "../i18n/context";
import { todayIso } from "../i18n/format";
import type { Messages } from "../i18n/messages";
import { Collapse } from "../shared/Collapse";
import { useHydrated } from "../shared/hooks";
import { DETAIL_FIELDS, PROFILE_DEFAULTS, type ProfileChoices } from "./choices";
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

/** Whether the form is the compact one, in which every section can be opened and closed. */
const CompactContext = /* @__PURE__ */ createContext(false);

/**
 * A heading and the fields under it. In the compact form the heading is a row that opens and closes them: open from
 * the start when `open` is set or when some of them are answered (`count`, which is also shown beside the heading).
 */
function Section({
  title,
  show = true,
  open = false,
  count = 0,
  children,
}: {
  title: string;
  show?: boolean;
  open?: boolean;
  count?: number;
  children: ReactNode;
}) {
  const compact = useContext(CompactContext);
  if (!show) return null;
  if (!compact)
    return (
      <>
        <SectionLabel>{title}</SectionLabel>
        {children}
      </>
    );
  return (
    <Full>
      <Collapse
        level={3}
        icon="left"
        flush
        defaultOpen={open || count > 0}
        summary={
          <Text
            fontSize="xs"
            fontWeight="700"
            letterSpacing={1}
            textTransform="uppercase"
            color="placeholder-color"
          >
            {title}
            {count > 0 ? ` (${count})` : ""}
          </Text>
        }
      >
        <div className="bo-grid" style={{ paddingTop: 8 }}>
          {children}
        </div>
      </Collapse>
    </Full>
  );
}

/**
 * The layout follows the width of the form itself (container queries are not even needed): every group of fields is
 * a grid of as many equal columns as fit, each at least as wide as the group's `min`, so the two fields of a group
 * share a row at 50% each as soon as there is room, three at a third, and the amounts all five on one line, with no
 * breakpoints to leave a gap between them. Headings and the yes/no details take the whole row. The form is as wide as
 * the element it is put in (the host sets that width). The first group has no heading: the form needs no title to
 * say what it starts with.
 */
const FORM_CSS = `
/* container-type makes the width independent of the content, so the form takes the width it is given */
.bo-form{container-type:inline-size;width:100%;min-width:0}
/* Until the page is running the form does not know the address, so it would show empty fields and then fill them in.
   The space is kept and the fields appear already filled. */
.bo-form[data-ready="false"] .bo-grid{visibility:hidden}
.bo-grid{display:flex;flex-direction:column;gap:14px}
.bo-fluid{display:grid;grid-template-columns:repeat(auto-fit,minmax(var(--bo-min,140px),1fr));column-gap:12px;row-gap:14px;align-items:start}
.bo-fluid>*{min-width:0}
.bo-fluid.bo-end{align-items:end}
.bo-section{display:flex;align-items:center;gap:10px;margin-top:10px}
.bo-section:first-child{display:none}
.bo-compact{gap:10px}
.bo-compact .bo-fluid{row-gap:10px}
.bo-compact .bo-section{margin-top:2px}
.bo-rule{flex:1;height:1px;background:var(--border-color)}
`;

const MONEY_FIELDS = [
  "annualPayroll",
  "annualRevenue",
  "annualNetIncome",
  "largestContractorPaymentUsd",
  "priorYearPayrollTaxLiability",
] as const;

/** The fields of one group: as many equal columns as fit, each at least `min` px wide; see `FORM_CSS`. */
function Group({ min, end, children }: { min: number; end?: boolean; children: ReactNode }) {
  return (
    <div className={end ? "bo-fluid bo-end" : "bo-fluid"} style={{ "--bo-min": `${min}px` } as CSSProperties}>
      {children}
    </div>
  );
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
  /**
   * A form short enough to sit beside the results without scrolling: every section can be opened and closed. Only
   * the business starts open; the others start closed unless some of their questions are answered. Spacing is
   * tighter too.
   */
  compact?: boolean;
  /** Called with the name of a choice (never its value) when the person changes it. */
  onFieldUsed?: (field: keyof ProfileChoices) => void;
}

function ProfileFormBody({
  today,
  onFieldUsed,
  compact = false,
}: Pick<ProfileFormProps, "today" | "onFieldUsed" | "compact">) {
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

  // Only what the visitor answered counts: what the host fixed (a page for a business that exists fixes "formed") is not
  // theirs, and is not shown as a question.
  const answered = (keys: readonly (keyof ProfileChoices)[]) =>
    keys.filter((key) => !fixed.has(key) && choices[key] !== PROFILE_DEFAULTS[key]).length;
  const more = (
    <>
      {/* The amounts share one fluid row: as many as fit, so all five side by side when the form is wide. */}
      <Section
        title={f.money}
        show={MONEY_FIELDS.some((field) => shows(field))}
        count={answered(MONEY_FIELDS)}
      >
        <Group min={130} end>
          {(
            [
              ["annualPayroll", f.payroll, f.examples.payroll],
              ["annualRevenue", f.revenue, f.examples.revenue],
              ["annualNetIncome", f.netIncome, f.examples.netIncome],
              ["largestContractorPaymentUsd", f.contractor, f.examples.contractor],
              ["priorYearPayrollTaxLiability", f.priorTax, f.examples.priorTax],
            ] as const
          ).map(
            ([field, label, example]) =>
              shows(field) && (
                <div key={field} data-bo-field={field}>
                  <NumberControl
                    id={`${prefix}-${field}`}
                    field={field}
                    label={label}
                    placeholder={example}
                    kind="amount"
                    prefix="$"
                  />
                </div>
              ),
          )}
        </Group>
      </Section>

      <Section
        title={f.tax}
        show={shows("fiscalYearEndMonth") || askLlcTax}
        count={answered(["fiscalYearEndMonth", "llcTaxClassification"])}
      >
        <Group min={200}>
          {shows("fiscalYearEndMonth") && (
            <div data-bo-field="fiscalYearEndMonth">
              <ChoiceField
                id={`${prefix}-fiscalMonth`}
                label={f.fiscalMonth}
                hint={f.hints.fiscalMonth}
                value={choices.fiscalYearEndMonth === undefined ? "" : String(choices.fiscalYearEndMonth)}
                blank={f.calendarYear}
                options={Array.from({ length: 11 }, (_, month) => [String(month + 1), monthName(month)])}
                onChange={(value) => set({ fiscalYearEndMonth: value ? Number(value) : undefined })}
              />
            </div>
          )}
          {askLlcTax && (
            <div data-bo-field="llcTaxClassification">
              <ChoiceField
                id={`${prefix}-llcTax`}
                label={f.llcTax}
                hint={f.hints.llcTax}
                value={choices.llcTaxClassification ?? ""}
                blank={f.notSure}
                options={LLC_TAX_CLASSIFICATIONS.map((kind) => [kind, f.llcTaxClassifications[kind]])}
                onChange={(value) =>
                  set({
                    llcTaxClassification: (value || undefined) as ProfileChoices["llcTaxClassification"],
                  })
                }
              />
            </div>
          )}
        </Group>
      </Section>

      <Section title={m.profile.details} show={askDetails} count={answered(["isFormed", ...DETAIL_FIELDS])}>
        <Full>
          <DetailsField legend={false} />
        </Full>
      </Section>
    </>
  );
  const dates = (
    <>
      <Section
        title={f.dates}
        show={shows("asOf", "openingDate") || (choices.isFormed && shows("formationDate"))}
        count={answered(["asOf", "openingDate", "formationDate"])}
      >
        <Group min={190}>
          {choices.isFormed && shows("formationDate") && (
            <div data-bo-field="formationDate">
              <DateField
                id={`${prefix}-formationDate`}
                label={f.formationDate}
                hint={f.hints.formationDate}
                value={choices.formationDate}
                onChange={(value) => set({ formationDate: value })}
                max={asOf}
              />
            </div>
          )}
          {shows("asOf") && (
            <div data-bo-field="asOf">
              <DateField
                id={`${prefix}-asOf`}
                label={f.startToday}
                hint={f.hints.startToday}
                value={asOf}
                onChange={(value) => set({ asOf: value === now ? "" : value })}
              />
            </div>
          )}
          {shows("openingDate") && (
            <div data-bo-field="openingDate">
              <DateField
                id={`${prefix}-openingDate`}
                label={f.targetOpening}
                hint={f.hints.targetOpening}
                value={choices.openingDate}
                onChange={(value) => set({ openingDate: value })}
                min={asOf}
                clearable
              />
            </div>
          )}
        </Group>
      </Section>
    </>
  );

  return (
    <CompactContext.Provider value={compact}>
      <div className={compact ? "bo-grid bo-compact" : "bo-grid"}>
        <Section title={f.business} show={shows("zip", "entityType", "naics") || askProfession} open>
          <Group min={200}>
            {shows("entityType") && (
              <div data-bo-field="entityType">
                <TypeField />
              </div>
            )}
            {shows("naics") && (
              <div data-bo-field="naics">
                <IndustryField />
              </div>
            )}
            {shows("zip") && (
              <div data-bo-field="zip">
                <ZipField id={`${prefix}-zip`} />
              </div>
            )}
            {askProfession && (
              <div data-bo-field="profession">
                <ChoiceField
                  id={`${prefix}-profession`}
                  label={f.profession}
                  value={choices.profession ?? ""}
                  blank={f.professionPlaceholder}
                  options={PROFESSIONS.map((profession) => [profession, f.professions[profession]])}
                  onChange={(value) =>
                    set({ profession: (value || undefined) as ProfileChoices["profession"] })
                  }
                />
              </div>
            )}
          </Group>
        </Section>

        <Section
          title={f.size}
          show={shows("employeeCount", "ownerCount", "fullTimeEmployeeCount")}
          count={answered(["employeeCount", "ownerCount", "fullTimeEmployeeCount"])}
        >
          <Group min={110}>
            {shows("employeeCount") && (
              <div data-bo-field="employeeCount">
                <EmployeesField placeholder="0" />
              </div>
            )}
            {shows("ownerCount") && (
              <div data-bo-field="ownerCount">
                <NumberControl
                  id={`${prefix}-owners`}
                  field="ownerCount"
                  label={f.owners}
                  hint={f.hints.owners}
                  placeholder={f.ownersPlaceholder}
                  kind="owners"
                />
              </div>
            )}
            {shows("fullTimeEmployeeCount") && (
              <div data-bo-field="fullTimeEmployeeCount">
                <NumberControl
                  id={`${prefix}-fullTime`}
                  field="fullTimeEmployeeCount"
                  label={f.fullTime}
                  hint={f.hints.fullTime}
                  placeholder={f.fullTimePlaceholder}
                  kind="employees"
                />
              </div>
            )}
          </Group>
        </Section>

        {more}
        {dates}
      </div>
    </CompactContext.Provider>
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
export function ProfileForm({ locale, messages, values, today, compact, onFieldUsed }: ProfileFormProps) {
  const body = <ProfileFormBody today={today} onFieldUsed={onFieldUsed} compact={compact} />;
  const ready = useHydrated();
  return (
    <WithLocale locale={locale} messages={messages}>
      {/* Nothing is submitted, but Enter in a field must not reload the page. */}
      <form className="bo-form" data-ready={ready} onSubmit={(event) => event.preventDefault()}>
        <style>{FORM_CSS}</style>
        {/* Without JavaScript the form is not going to become ready; show it as it is. */}
        <noscript>
          <style>{`.bo-form[data-ready="false"] .bo-grid{visibility:visible}`}</style>
        </noscript>
        {values ? <ProfileQueryProvider values={values}>{body}</ProfileQueryProvider> : body}
      </form>
    </WithLocale>
  );
}
