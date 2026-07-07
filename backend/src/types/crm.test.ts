import { describe, it, expect } from "vitest";
import { CRM_STATUSES, DATA_SOURCES, emptyCrmRecord } from "../types/crm.js";

describe("CRM types", () => {
  it("has correct status values", () => {
    expect(CRM_STATUSES).toContain("GOOD_LEAD_FOLLOW_UP");
    expect(CRM_STATUSES).toHaveLength(4);
  });

  it("has correct data source values", () => {
    expect(DATA_SOURCES).toContain("meridian_tower");
    expect(DATA_SOURCES).toHaveLength(5);
  });

  it("creates empty CRM record with all fields", () => {
    const record = emptyCrmRecord();
    expect(record.email).toBe("");
    expect(record.crm_status).toBe("");
    expect(Object.keys(record)).toHaveLength(15);
  });
});
