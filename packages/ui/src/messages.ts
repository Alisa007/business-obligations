import type { ComplianceItem } from "business-obligations";

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
}

const plural = (locale: string, n: number, one: string, other: string) =>
  new Intl.PluralRules(locale).select(n) === "one" ? one : other;

const en: Messages = {
  fileFormation: "File formation",
  readyToOperate: "Ready to operate",
  openingDate: "Opening date",
  notSet: "Not set",
  addOpeningDate: "Add a target opening date to check the plan fits",
  opening: "Opening",
  onTrack: (n) => `On track, ${n} ${plural("en", n, "day", "days")} of slack`,
  tooSoon: (n) => `${n} ${plural("en", n, "day", "days")} too soon`,
  progress: "Progress",
  savedInBrowser: "Saved in this browser",
  knownFees: "Known fees",
  oneTime: "one-time",
  perYear: (amount) => `${amount} per year`,
  done: "done",
  toDo: (n) => `${n} to do`,
  onward: "onward",
  after: "After:",
  dueOn: (date, relative) => `Statutory deadline: ${date} · ${relative}`,
  by: (date) => `Suggested planning date: ${date}`,
  triggeredBy: (reason, schedule) => `Applies because: ${reason}.${schedule ? ` Schedule: ${schedule}.` : ""}`,
  planNote:
    "Suggested planning dates are allowances, not agency processing times. Statutory deadlines come from the rules and are labeled as such.",
  fee: (amount) => `fee ${amount}`,
  checked: (date) => `checked${date ? ` ${date}` : ""}`,
  partlyUnconfirmed: "partly unconfirmed",
  notIndividuallyChecked: "not individually checked",
  reviewOverdue: "review overdue",
  findObligation: "Find an obligation",
  showing: (shown, total) => `Showing ${shown} of ${total} obligations`,
  clearFilters: "Clear filters",
  searchObligations: "Search obligations",
  category: "Category",
  allCategories: "All categories",
  dataConfidence: "Data confidence",
  allConfidenceLevels: "All confidence levels",
  checkedAgainstOfficial: "Checked against official pages",
  needsVerification: "Needs verification",
  all: "All",
  noMatch: "No obligations match these filters.",
  whyItApplies: "Why it applies",
  replacedBy: "Replaced by",
  appliesWhen: "Applies when",
  exceptions: "Exceptions",
  authority: "Authority",
  howToFile: "How to file",
  form: (id) => `Form ${id}`,
  renewal: "Renewal",
  ifLate: "If late",
  plusPerMonth: (percent) => ` plus ${percent}% per month`,
  sources: "Sources",
  pdf: " (PDF)",
  archivedCopy: "archived copy",
  data: "Data",
  checkedAgainst: (date) => `Checked against official pages on ${date}`,
  compiledFrom: (date) =>
    `Compiled from public sources${date ? ` on ${date}` : ""}; not individually checked`,
  reviewOverdueSince: (date) => `Review overdue since ${date}`,
  reviewDueBy: (date) => `Review due by ${date}`,
  seeAnError: "See an error?",
  reportIt: "Report it or suggest a correction",
  jurisdictions: { federal: "Federal", state: "State", county: "County", city: "City" },
  frequencies: {
    once: "One-time",
    annual: "Annual",
    biennial: "Every 2 years",
    every_five_years: "Every 5 years",
    quarterly: "Quarterly",
    monthly: "Monthly",
    per_event: "Per event",
    ongoing: "Ongoing",
  },
  categories: {
    license: "license",
    permit: "permit",
    registration: "registration",
    filing: "filing",
    payment: "payment",
    insurance: "insurance",
    recordkeeping: "recordkeeping",
  },
  filingMethods: { online: "online", mail: "by mail", in_person: "in person", fax: "by fax" },
  operators: {
    ">=": "at least",
    ">": "more than",
    "<=": "at most",
    "<": "less than",
    "==": "is",
    "!=": "is not",
    in: "is one of",
  },
  fields: {},
  confidence: { checked: "checked", compiled: "not individually checked", unconfirmed: "partly unconfirmed" },
};

const es: Messages = {
  fileFormation: "Presentar la constitución",
  readyToOperate: "Listo para operar",
  openingDate: "Fecha de apertura",
  notSet: "Sin definir",
  addOpeningDate: "Agregue una fecha de apertura prevista para comprobar que el plan alcanza",
  opening: "Apertura",
  onTrack: (n) => `En plazo, ${n} ${plural("es", n, "día", "días")} de margen`,
  tooSoon: (n) => `${n} ${plural("es", n, "día", "días")} antes de estar listo`,
  progress: "Avance",
  savedInBrowser: "Guardado en este navegador",
  knownFees: "Tarifas conocidas",
  oneTime: "únicas",
  perYear: (amount) => `${amount} por año`,
  done: "listo",
  toDo: (n) => `${n} por hacer`,
  onward: "en adelante",
  after: "Después de:",
  dueOn: (date, relative) => `Plazo legal: ${date} · ${relative}`,
  by: (date) => `Fecha de planificación sugerida: ${date}`,
  triggeredBy: (reason, schedule) => `Se aplica porque: ${reason}.${schedule ? ` Calendario: ${schedule}.` : ""}`,
  planNote:
    "Las fechas de planificación sugeridas son márgenes, no plazos de trámite de las agencias. Los plazos legales provienen de las reglas y se indican como tales.",
  fee: (amount) => `tarifa ${amount}`,
  checked: (date) => `verificado${date ? ` ${date}` : ""}`,
  partlyUnconfirmed: "parcialmente sin confirmar",
  notIndividuallyChecked: "no verificado individualmente",
  reviewOverdue: "revisión vencida",
  findObligation: "Buscar una obligación",
  showing: (shown, total) => `Mostrando ${shown} de ${total} obligaciones`,
  clearFilters: "Borrar filtros",
  searchObligations: "Buscar obligaciones",
  category: "Categoría",
  allCategories: "Todas las categorías",
  dataConfidence: "Confiabilidad de los datos",
  allConfidenceLevels: "Todos los niveles de confianza",
  checkedAgainstOfficial: "Verificado con las páginas oficiales",
  needsVerification: "Requiere verificación",
  all: "Todas",
  noMatch: "Ninguna obligación coincide con estos filtros.",
  whyItApplies: "Por qué aplica",
  replacedBy: "Reemplazada por",
  appliesWhen: "Aplica cuando",
  exceptions: "Excepciones",
  authority: "Autoridad",
  howToFile: "Cómo presentarla",
  form: (id) => `Formulario ${id}`,
  renewal: "Renovación",
  ifLate: "Si se atrasa",
  plusPerMonth: (percent) => ` más ${percent}% por mes`,
  sources: "Fuentes",
  pdf: " (PDF)",
  archivedCopy: "copia archivada",
  data: "Datos",
  checkedAgainst: (date) => `Verificado con las páginas oficiales el ${date}`,
  compiledFrom: (date) =>
    `Compilado de fuentes públicas${date ? ` el ${date}` : ""}; no verificado individualmente`,
  reviewOverdueSince: (date) => `Revisión vencida desde el ${date}`,
  reviewDueBy: (date) => `Revisión prevista antes del ${date}`,
  seeAnError: "¿Ve un error?",
  reportIt: "Infórmelo o sugiera una corrección",
  jurisdictions: { federal: "Federal", state: "Estatal", county: "Condado", city: "Ciudad" },
  frequencies: {
    once: "Una sola vez",
    annual: "Anual",
    biennial: "Cada 2 años",
    every_five_years: "Cada 5 años",
    quarterly: "Trimestral",
    monthly: "Mensual",
    per_event: "Por evento",
    ongoing: "Continuo",
  },
  categories: {
    license: "licencia",
    permit: "permiso",
    registration: "registro",
    filing: "presentación",
    payment: "pago",
    insurance: "seguro",
    recordkeeping: "conservación de registros",
  },
  filingMethods: { online: "en línea", mail: "por correo", in_person: "en persona", fax: "por fax" },
  operators: {
    ">=": "al menos",
    ">": "más de",
    "<=": "como máximo",
    "<": "menos de",
    "==": "es",
    "!=": "no es",
    in: "es uno de",
  },
  fields: {
    employeeCount: "número de empleados",
    fullTimeEmployeeCount: "número de empleados a tiempo completo",
    annualPayroll: "nómina anual",
    annualRevenue: "ingresos anuales",
    annualNetIncome: "ingresos netos anuales",
    largestContractorPaymentUsd: "mayor pago a un contratista",
    activities: "actividades",
    county: "condado",
    city: "ciudad",
    state: "estado",
    entityType: "tipo de entidad",
    industry: "sector",
    naics: "código NAICS",
    homeBased: "negocio desde el hogar",
    hasSignage: "rótulos exteriores",
    sellsTaxableGoods: "vende bienes gravables",
    usesTradeName: "usa un nombre comercial",
    projectValueUsd: "valor del proyecto",
    disturbedAcres: "acres removidos",
    floorAreaSqFt: "superficie en pies cuadrados",
  },
  confidence: {
    checked: "verificado",
    compiled: "no verificado individualmente",
    unconfirmed: "parcialmente sin confirmar",
  },
};

en.fields = {
  employeeCount: "number of employees",
  fullTimeEmployeeCount: "number of full-time employees",
  annualPayroll: "annual payroll",
  annualRevenue: "annual revenue",
  annualNetIncome: "annual net income",
  largestContractorPaymentUsd: "largest contractor payment",
  activities: "activities",
  county: "county",
  city: "city",
  state: "state",
  entityType: "entity type",
  industry: "industry",
  naics: "NAICS code",
  homeBased: "home-based business",
  hasSignage: "exterior signage",
  sellsTaxableGoods: "sells taxable goods",
  usesTradeName: "uses a trade name",
  projectValueUsd: "project value",
  disturbedAcres: "acres disturbed",
  floorAreaSqFt: "floor area in square feet",
};

/** The bundled message tables. */
export const messages: Record<Locale, Messages> = { en, es };

/** The messages for a locale code such as "es" or "es-MX"; English when the language has no table. */
export function getMessages(locale?: string): Messages {
  const language = locale?.toLowerCase().split("-")[0];
  return language === "es" ? es : en;
}
