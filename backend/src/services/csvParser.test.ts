import { describe, it, expect } from "vitest";
import { parseCsvBuffer, chunkArray, hasContactInfo } from "../services/csvParser.js";

describe("csvParser", () => {
  it("parses a simple CSV buffer", () => {
    const csv = `name,email,phone
John Doe,john@example.com,9876543210
Jane Smith,jane@example.com,9876543211`;

    const result = parseCsvBuffer(Buffer.from(csv));
    expect(result.headers).toEqual(["name", "email", "phone"]);
    expect(result.totalRows).toBe(2);
    expect(result.rows[0].data.name).toBe("John Doe");
  });

  it("handles BOM and quoted fields", () => {
    const csv = `\uFEFF"Full Name","Email Address","Notes"
"John Doe","john@example.com","Interested in demo"`;

    const result = parseCsvBuffer(Buffer.from(csv));
    expect(result.headers[0]).toBe("Full Name");
    expect(result.rows[0].data["Email Address"]).toBe("john@example.com");
  });

  it("chunks arrays correctly", () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("detects contact info", () => {
    expect(hasContactInfo({ email: "a@b.com" })).toBe(true);
    expect(hasContactInfo({ mobile_without_country_code: "123" })).toBe(true);
    expect(hasContactInfo({})).toBe(false);
  });
});
