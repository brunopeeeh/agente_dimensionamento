import { describe, it, expect } from "vitest";
import { toBlock20, isTimeInShift, getLunchEndTime, addMinutesToTime } from "./time";

describe("toBlock20", () => {
  it("rounds down to the nearest 20-minute block", () => {
    expect(toBlock20("07:05")).toBe("07:00");
    expect(toBlock20("07:19")).toBe("07:00");
    expect(toBlock20("07:20")).toBe("07:20");
    expect(toBlock20("07:59")).toBe("07:40");
  });
});

describe("isTimeInShift", () => {
  it("handles a same-day shift with an exclusive end", () => {
    expect(isTimeInShift("10:00", "09:00", "18:00")).toBe(true);
    expect(isTimeInShift("08:59", "09:00", "18:00")).toBe(false);
    expect(isTimeInShift("18:00", "09:00", "18:00")).toBe(false);
  });

  it("handles a shift that crosses midnight", () => {
    expect(isTimeInShift("23:30", "18:00", "03:00")).toBe(true);
    expect(isTimeInShift("02:00", "18:00", "03:00")).toBe(true);
    expect(isTimeInShift("10:00", "18:00", "03:00")).toBe(false);
  });
});

describe("getLunchEndTime", () => {
  it("adds exactly one hour, wrapping past midnight", () => {
    expect(getLunchEndTime("12:00")).toBe("13:00");
    expect(getLunchEndTime("23:30")).toBe("00:30");
  });
});

describe("addMinutesToTime", () => {
  it("wraps minutes, hours, and days correctly", () => {
    expect(addMinutesToTime("23:50", 20)).toBe("00:10");
    expect(addMinutesToTime("09:00", 90)).toBe("10:30");
  });
});
