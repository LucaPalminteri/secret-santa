import { describe, expect, it } from "vitest";
import { validateEmail } from "../../src/utils/utils";

describe("email validation", () => {
  it.each([
    "ana@example.com",
    "ANA@EXAMPLE.COM",
    "ana.maria+gifts@example.co.uk",
    "ana_maria@example.org",
  ])("accepts %j", (email) => {
    expect(validateEmail(email)).toBe(true);
  });

  it.each([
    "",
    "ana",
    "ana@example",
    "@example.com",
    "ana@",
    "ana@@example.com",
    "ana maria@example.com",
    "ana@exam ple.com",
    " ana@example.com",
    "ana@example.com ",
    "ana@example.com\n",
  ])("rejects %j", (email) => {
    expect(validateEmail(email)).toBe(false);
  });
});
