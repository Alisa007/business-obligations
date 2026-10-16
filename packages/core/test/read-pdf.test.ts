import { describe, expect, it } from "vitest";
// @ts-expect-error plain JS module
import { assertPublicHttps, findContext, isPrivateAddress } from "../scripts/read-pdf.mjs";

describe("read-pdf safety", () => {
  it("recognises non-public addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254",
      "0.0.0.0",
      "100.64.0.1",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:10.0.0.1",
    ])
      expect(isPrivateAddress(ip), ip).toBe(true);
    for (const ip of ["8.8.8.8", "172.32.0.1", "151.101.1.1", "2606:4700::1111"])
      expect(isPrivateAddress(ip), ip).toBe(false);
  });

  it("only accepts public https URLs", async () => {
    const publicHost = async () => [{ address: "93.184.216.34", family: 4 }];
    const privateHost = async () => [{ address: "10.0.0.5", family: 4 }];
    await expect(assertPublicHttps("https://example.gov/a.pdf", publicHost)).resolves.toBeInstanceOf(URL);
    await expect(assertPublicHttps("http://example.gov/a.pdf", publicHost)).rejects.toThrow(/https/);
    await expect(assertPublicHttps("https://user:pw@example.gov/a.pdf", publicHost)).rejects.toThrow(
      /credentials/,
    );
    await expect(assertPublicHttps("https://intranet.example/a.pdf", privateHost)).rejects.toThrow(
      /non-public/,
    );
    await expect(assertPublicHttps("https://169.254.169.254/latest/meta-data", publicHost)).rejects.toThrow(
      /non-public/,
    );
    await expect(assertPublicHttps("https://[::1]/a.pdf", publicHost)).rejects.toThrow(/non-public/);
    await expect(assertPublicHttps("file:///etc/passwd", publicHost)).rejects.toThrow(/https/);
  });
});

describe("read-pdf --find", () => {
  const text = [
    "a",
    "b",
    "Business license fee",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "Business License renewal",
    "j",
  ].join("\n");
  it("returns passages around matches, case-insensitively", () => {
    expect(findContext(text, "business license", 1)).toBe(
      ["b", "Business license fee", "c", "--", "i", "Business License renewal", "j"].join("\n"),
    );
    expect(findContext(text, "nothing here", 1)).toBe("");
  });
});
