import { describe, expect, it } from "vitest";
import { easeOutCubic, formatNumber, interpolate, parseNumberText } from "./logic";

describe("parseNumberText", () => {
  it("plain integer", () => {
    expect(parseNumberText("500")).toEqual({
      prefix: "",
      suffix: "",
      value: 500,
      decimals: 0,
      decimalSeparator: ".",
      thousandsSeparator: null,
    });
  });

  it("suffix", () => {
    const r = parseNumberText("500+")!;
    expect(r.value).toBe(500);
    expect(r.suffix).toBe("+");
  });

  it("prefix", () => {
    const r = parseNumberText("$1200")!;
    expect(r.value).toBe(1200);
    expect(r.prefix).toBe("$");
  });

  it("international thousands + decimal ($1,234.56)", () => {
    const r = parseNumberText("$1,234.56")!;
    expect(r.value).toBe(1234.56);
    expect(r.decimals).toBe(2);
    expect(r.thousandsSeparator).toBe(",");
    expect(r.decimalSeparator).toBe(".");
    expect(r.prefix).toBe("$");
  });

  it("German-style thousands + decimal (1.234,56) with decimalSeparator ','", () => {
    const r = parseNumberText("1.234,56", ",")!;
    expect(r.value).toBe(1234.56);
    expect(r.decimals).toBe(2);
    expect(r.thousandsSeparator).toBe(".");
    expect(r.decimalSeparator).toBe(",");
  });

  it("thousands only, no decimal (10,000)", () => {
    const r = parseNumberText("10,000")!;
    expect(r.value).toBe(10000);
    expect(r.decimals).toBe(0);
    expect(r.thousandsSeparator).toBe(",");
  });

  it("decimal only, no thousands (99.9%)", () => {
    const r = parseNumberText("99.9%")!;
    expect(r.value).toBe(99.9);
    expect(r.decimals).toBe(1);
    expect(r.thousandsSeparator).toBeNull();
    expect(r.suffix).toBe("%");
  });

  it("repeated separator with no decimal at all is thousands grouping, not a bug (1.234.567)", () => {
    const r = parseNumberText("1.234.567", ".")!;
    expect(r.value).toBe(1234567);
    expect(r.decimals).toBe(0);
    expect(r.thousandsSeparator).toBe(".");
  });

  it("a lone separator matching decimalSeparator, appearing once, IS the decimal — even if it looks like grouping", () => {
    // This is inherent, documented ambiguity: the caller's decimalSeparator setting
    // is authoritative when there's only one separator character to go on.
    const r = parseNumberText("1,234", ",")!;
    expect(r.value).toBe(1.234);
    expect(r.decimals).toBe(3);
  });

  it("bails (null) on a genuinely ambiguous case: two decimal points", () => {
    expect(parseNumberText("1,234.567.89")).toBeNull();
  });

  it("bails (null) rather than misparse German formatting under the default (dot) decimalSeparator", () => {
    // "1.234,56" is 1234.56 in German formatting, but with decimalSeparator
    // left at the default "." this looks like decimal "1", garbage ",234,56"
    // as the fractional part — correctly refused rather than silently wrong.
    expect(parseNumberText("1.234,56")).toBeNull();
  });

  it("returns null for text with no digits at all", () => {
    expect(parseNumberText("no numbers here")).toBeNull();
  });

  it("prefix + suffix + full formatting together", () => {
    const r = parseNumberText("$1,234.5M+")!;
    expect(r.prefix).toBe("$");
    expect(r.value).toBe(1234.5);
    expect(r.suffix).toBe("M+");
  });
});

describe("formatNumber", () => {
  it("re-renders a plain integer", () => {
    expect(formatNumber(500, { prefix: "", suffix: "", decimals: 0, decimalSeparator: ".", thousandsSeparator: null })).toBe("500");
  });

  it("re-applies thousands grouping and decimal formatting", () => {
    const formatted = formatNumber(1234.56, { prefix: "$", suffix: "", decimals: 2, decimalSeparator: ".", thousandsSeparator: "," });
    expect(formatted).toBe("$1,234.56");
  });

  it("re-applies German-style grouping", () => {
    const formatted = formatNumber(1234.56, { prefix: "", suffix: "", decimals: 2, decimalSeparator: ",", thousandsSeparator: "." });
    expect(formatted).toBe("1.234,56");
  });

  it("round-trips every example through parse -> format unchanged", () => {
    for (const [text, sep] of [
      ["500", "."],
      ["500+", "."],
      ["$1,234.56", "."],
      ["1.234,56", ","],
      ["10,000", "."],
      ["99.9%", "."],
    ] as const) {
      const parsed = parseNumberText(text, sep)!;
      expect(formatNumber(parsed.value, parsed)).toBe(text);
    }
  });

  it("pads decimals with a trailing zero mid-animation if the target has them", () => {
    const formatted = formatNumber(50, { prefix: "", suffix: "%", decimals: 1, decimalSeparator: ".", thousandsSeparator: null });
    expect(formatted).toBe("50.0%");
  });
});

describe("easeOutCubic", () => {
  it("starts at 0", () => expect(easeOutCubic(0)).toBe(0));
  it("ends at 1", () => expect(easeOutCubic(1)).toBe(1));
  it("is front-loaded (more progress in the first half than the second)", () => {
    const firstHalf = easeOutCubic(0.5) - easeOutCubic(0);
    const secondHalf = easeOutCubic(1) - easeOutCubic(0.5);
    expect(firstHalf).toBeGreaterThan(secondHalf);
  });
  it("clamps below 0", () => expect(easeOutCubic(-1)).toBe(0));
  it("clamps above 1", () => expect(easeOutCubic(2)).toBe(1));
});

describe("interpolate", () => {
  it("is at the start value at elapsed 0", () => expect(interpolate(0, 100, 0, 1000)).toBe(0));
  it("is at the end value once elapsed reaches the duration", () => expect(interpolate(0, 100, 1000, 1000)).toBe(100));
  it("is at the end value if elapsed overshoots the duration", () => expect(interpolate(0, 100, 5000, 1000)).toBe(100));
  it("supports a non-zero start value", () => expect(interpolate(50, 100, 1000, 1000)).toBe(100));
  it("returns the end value immediately for a zero duration", () => expect(interpolate(0, 100, 0, 0)).toBe(100));
});
