import type { ComplianceItem, EntityType, LlcTaxClassification, Profession } from "business-obligations";
import type { DetailField } from "../../profile/choices";
import type { FieldError } from "../../profile/validation";

export type Locale = "en" | "es";

type Category = ComplianceItem["category"];
type Frequency = ComplianceItem["frequency"];
type Jurisdiction = ComplianceItem["jurisdiction"];
type FilingMethod = NonNullable<ComplianceItem["filingMethod"]>[number];
type Operator = ">=" | ">" | "<=" | "<" | "==" | "!=" | "in";
type Confidence = NonNullable<ComplianceItem["provenance"]>["confidence"];

/**
 * Every piece of interface text the components show. Text that comes from the data (titles, descriptions, reasons,
 * deadlines) is not here: translate it with `localizePlan` / `localize` from `business-obligations` first.
 */
export interface Messages {
  // Launch plan
  fileFormation: string;
  readyToOperate: string;
  openingDate: string;
  notSet: string;
  addOpeningDate: string;
  opening: string;
  onTrack: (slackDays: number) => string;
  tooSoon: (days: number) => string;
  progress: string;
  savedInBrowser: string;
  knownFees: string;
  oneTime: string;
  perYear: (amount: string) => string;
  done: string;
  toDo: (count: number) => string;
  onward: string;
  after: string;
  dueOn: (date: string, relative: string) => string;
  by: (date: string) => string;
  /** What makes a legal deadline apply: the reason it applies and, when the rule has one, its schedule. */
  triggeredBy: (reason: string, schedule?: string) => string;
  planNote: string;
  // Chips
  fee: (amount: string) => string;
  checked: (date?: string) => string;
  partlyUnconfirmed: string;
  notIndividuallyChecked: string;
  reviewOverdue: string;
  // Filters and list
  findObligation: string;
  showing: (shown: number, total: number) => string;
  clearFilters: string;
  searchObligations: string;
  category: string;
  allCategories: string;
  dataConfidence: string;
  allConfidenceLevels: string;
  checkedAgainstOfficial: string;
  needsVerification: string;
  all: string;
  noMatch: string;
  // Details
  whyItApplies: string;
  replacedBy: string;
  appliesWhen: string;
  yes: string;
  no: string;
  /** Heading of the section of items that apply only if something not yet known turns out a certain way. */
  conditionalHeading: string;
  conditionalNote: string;
  /** The chip on such an item: `condition` is like "number of employees: 1, 2". */
  appliesIf: (condition: string) => string;
  exceptions: string;
  authority: string;
  howToFile: string;
  form: (id: string) => string;
  renewal: string;
  ifLate: string;
  plusPerMonth: (percent: number) => string;
  sources: string;
  pdf: string;
  archivedCopy: string;
  data: string;
  checkedAgainst: (date: string) => string;
  compiledFrom: (date?: string) => string;
  reviewOverdueSince: (date: string) => string;
  reviewDueBy: (date: string) => string;
  seeAnError: string;
  reportIt: string;
  // Words for enum values
  jurisdictions: Record<Jurisdiction, string>;
  frequencies: Record<Frequency, string>;
  categories: Record<Category, string>;
  filingMethods: Record<FilingMethod, string>;
  operators: Record<Operator, string>;
  /** Names of the profile fields that an "applies when" condition can read; unknown fields are shown as they are. */
  fields: Record<string, string>;
  confidence: Record<Confidence, string>;
  // The whole form (ProfileForm)
  profileForm: {
    business: string;
    zip: string;
    zipPlaceholder: string;
    zipUnknown: string;
    profession: string;
    professionPlaceholder: string;
    professions: Record<Profession, string>;
    size: string;
    owners: string;
    ownersPlaceholder: string;
    fullTime: string;
    fullTimePlaceholder: string;
    money: string;
    optional: string;
    /** Example amounts shown as the placeholder of each amount field. */
    examples: Record<"payroll" | "revenue" | "netIncome" | "contractor" | "priorTax", string>;
    payroll: string;
    revenue: string;
    netIncome: string;
    contractor: string;
    priorTax: string;
    tax: string;
    fiscalMonth: string;
    calendarYear: string;
    llcTax: string;
    notSure: string;
    llcTaxClassifications: Record<LlcTaxClassification, string>;
    notFormed: string;
    formationDate: string;
    dates: string;
    startToday: string;
    targetOpening: string;
    selectDate: string;
    /** Accessible name of a "?" next to a label: `about(label)` is "More about …". */
    about: (label: string) => string;
    /** What a field is for, shown in a tooltip next to its (short) label. */
    hints: Record<
      | "industry"
      | "owners"
      | "fullTime"
      | "payroll"
      | "revenue"
      | "netIncome"
      | "contractor"
      | "priorTax"
      | "fiscalMonth"
      | "llcTax"
      | "formationDate"
      | "startToday"
      | "targetOpening",
      string
    >;
    clearDate: string;
    previousMonth: string;
    nextMonth: string;
  };
  // Business details (TypeField, IndustryField, EmployeesField, DetailsField)
  profile: {
    entityType: string;
    /** Shown in the business type field when none is chosen. */
    entityTypePlaceholder: string;
    industry: string;
    industryPlaceholder: string;
    /** Under the industry field when no code is chosen. */
    industryEmpty: string;
    /** Under the industry field for a code with no title in the list. */
    industryCode: (code: string) => string;
    /** In the list of the industry field when a word matches nothing. */
    industryNone: string;
    /** Label of the button that empties the industry field. */
    clear: string;
    /** The three states of a yes/no detail, shown beside it. */
    answers: { yes: string; no: string; unanswered: string };
    /** What is wrong with a field, shown in red under it. */
    errors: Record<FieldError, string>;
    employees: string;
    details: string;
    entityTypes: Record<EntityType, string>;
    detailLabels: Record<DetailField, string>;
  };
}
