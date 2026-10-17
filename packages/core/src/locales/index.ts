import type { Catalog } from "../i18n";
import { en } from "./en";
import { es } from "./es";

export { en, es };

/** The bundled catalogs by locale code. Import `business-obligations/locales/es` directly to load only one. */
export const locales: Record<"en" | "es", Catalog> = { en, es };
