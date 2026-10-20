import { describe, expect, it } from "vitest";
// @ts-expect-error plain JS module
import { findDuplicateKeys } from "../scripts/check-json-keys.mjs";

describe("findDuplicateKeys", () => {
  it("finds duplicate keys in nested objects but not across objects", () => {
    expect(findDuplicateKeys('{"a": 1, "a": 2, "nested": {"a": 3, "b": 4}}')).toEqual([
      { key: "a", line: 1 },
    ]);
  });
});
