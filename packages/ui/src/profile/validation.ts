import { z } from "zod";
import { MAX_EMPLOYEES } from "./choices";

/** Which problem a field has. The text for each is in `messages.<locale>.profile.errors`. */
export type FieldError =
  | "employeesRange"
  | "wholeNumber"
  | "amountInvalid"
  | "naicsShort"
  | "naicsUnknown"
  | "ownersMin"
  | "fullTimeExceeds";

const error = (key: FieldError) => ({ error: key });

// The schemas are built when first used, not when the module loads, so that importing this package for something
// else costs nothing (a schema made at the top of a module is a call a bundler cannot drop).
const once = <T>(make: () => T): (() => T) => {
  let schema: T | undefined;
  return () => (schema ??= make());
};

/** What is typed in the employees box: empty (not given) or a whole number from 0 to `MAX_EMPLOYEES`. */
export const employeesTextSchema = /* @__PURE__ */ once(() =>
  z.union([
    z.literal(""),
    z
      .string()
      .regex(/^\d+$/, error("employeesRange"))
      .refine((digits) => Number(digits) <= MAX_EMPLOYEES, error("employeesRange")),
  ]),
);

/** What is typed in a box for a count with no upper limit (owners): empty or a whole number. */
export const wholeTextSchema = /* @__PURE__ */ once(() =>
  z.union([z.literal(""), z.string().regex(/^\d{1,9}$/, error("wholeNumber"))]),
);

/** What is typed in the owners box: empty or a whole number of at least 1 (the engine refuses 0 owners). */
export const ownersTextSchema = /* @__PURE__ */ once(() =>
  z.union([z.literal(""), z.string().regex(/^[1-9]\d{0,8}$/, error("ownersMin"))]),
);

/** What is typed in a box for an amount in dollars: empty, or digits with up to two decimals (`12.` is on its way). */
export const amountTextSchema = /* @__PURE__ */ once(() =>
  z.union([z.literal(""), z.string().regex(/^\d{1,12}(\.\d{0,2})?$/, error("amountInvalid"))]),
);

/**
 * What is typed in the industry box: words are a search and always fine, digits are a NAICS code, which needs at
 * least two of them (a code the list does not know is reported separately, once the list has loaded).
 */
export const naicsTextSchema = /* @__PURE__ */ once(() =>
  z
    .string()
    .refine((text) => !/^\d$/.test(text), error("naicsShort"))
    .refine((text) => !/^\d{7,}$/.test(text), error("naicsShort")),
);

/** The first problem the schema finds in `value`, or `undefined` when it is fine. */
export function firstError(schema: () => z.ZodType, value: unknown): FieldError | undefined {
  const result = schema().safeParse(value);
  return result.success ? undefined : (result.error.issues[0]?.message as FieldError | undefined);
}
