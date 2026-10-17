import type { Catalog } from "../../i18n";

/**
 * Authority labels that the engine builds from a place and a kind of office ("City clerk: Austin / Travis County").
 * Official agency names that come from the data ("Texas Comptroller of Public Accounts") are not translated.
 */
export const authorityPatterns: NonNullable<Catalog["patterns"]> = [
  ["{1!}: {2} / {3} County (ZIP {4:n})", "{1}: {2} / condado de {3} (código postal {4})"],
  ["{1} ({2} County) building department", "Departamento de edificación de {1} (condado de {2})"],
  ["{1} County health department ({2})", "Departamento de salud del condado de {1} ({2})"],
  [
    "{1} building department and state trade boards ({2})",
    "Departamento de edificación de {1} y juntas estatales de oficios ({2})",
  ],
  ["{1} County — {2!} ({3})", "Condado de {1} — {2} ({3})"],
  ["{1} — {2!} ({3})", "{1} — {2} ({3})"],
  ["{1} unclaimed property program", "Programa de bienes no reclamados de {1}"],
  ["{1} new hire reporting center", "Centro de informe de nuevas contrataciones de {1}"],
  [
    "{1} cities and counties that self-administer sales tax",
    "Ciudades y condados de {1} que administran por sí mismos el impuesto sobre ventas",
  ],
  [
    "{1} employment eligibility law / U.S. Citizenship and Immigration Services",
    "Ley de elegibilidad de empleo de {1} / Servicios de Ciudadanía e Inmigración de EE. UU. (USCIS)",
  ],
];
