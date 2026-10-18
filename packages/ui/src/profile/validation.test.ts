import { describe, expect, it } from "vitest";
import { PROFILE_DEFAULTS, readProfileQuery, writeProfileQuery } from "./choices";
import { employeesTextSchema, firstError, naicsTextSchema } from "./validation";

describe("validation", () => {
  it("accepts an empty head count or a whole number up to 10,000", () => {
    for (const ok of ["", "0", "12", "10000"]) expect(firstError(employeesTextSchema, ok)).toBeUndefined();
    for (const bad of ["10001", "99999", "-1", "1.5", "ab"])
      expect(firstError(employeesTextSchema, bad)).toBe("employeesRange");
  });

  it("treats words as a search, and digits as a code of 2 to 6 digits", () => {
    for (const ok of ["", "restaurant", "72", "722511", "7225"])
      expect(firstError(naicsTextSchema, ok)).toBeUndefined();
    for (const bad of ["7", "1234567"]) expect(firstError(naicsTextSchema, bad)).toBe("naicsShort");
  });
});

describe("cleared fields in the address", () => {
  it("reads and writes an empty type and an empty code as 'nothing', apart from the defaults", () => {
    const cleared = readProfileQuery("?type=&naics=");
    expect(cleared.entityType).toBeUndefined();
    expect(cleared.naics).toBe("");
    // no business type is chosen unless the host says so; clearing a host's default is written as an empty value
    expect(readProfileQuery("").entityType).toBeUndefined();
    expect(writeProfileQuery("", PROFILE_DEFAULTS)).toBe("");
    const llc = { ...PROFILE_DEFAULTS, entityType: "llc" as const };
    expect(readProfileQuery("?type=", llc).entityType).toBeUndefined();
    expect(writeProfileQuery("", { ...llc, entityType: undefined }, llc)).toBe("?type=");
    const host = { ...PROFILE_DEFAULTS, naics: "722" };
    expect(readProfileQuery("?naics=", host).naics).toBe("");
    expect(writeProfileQuery("", { ...host, naics: "" }, host)).toBe("?naics=");
  });
});
