export interface ParsedNumber {
  prefix: string;
  suffix: string;
  value: number;
  decimals: number;
  decimalSeparator: "." | ",";
  thousandsSeparator: "." | "," | null;
}

function splitOnLast(text: string, separator: string): [string, string] {
  const index = text.lastIndexOf(separator);
  return [text.slice(0, index), text.slice(index + 1)];
}

function countOf(text: string, char: string): number {
  return text.split(char).length - 1;
}

/**
 * Parses text like "$1,234.56 users" into its numeric target plus enough
 * formatting information (prefix, suffix, decimal places, thousands
 * grouping, which character means what) to reproduce the same shape while
 * animating through it.
 *
 * `decimalSeparator` tells the parser which character means "decimal point"
 * for this site when both "." and "," could plausibly be either — the other
 * one is assumed to be thousands grouping. A separator that appears more
 * than once can never be the decimal point (a real number has at most one),
 * so that case is resolved as thousands grouping regardless of the prop.
 * Returns null for genuinely ambiguous/malformed input rather than guessing.
 */
export function parseNumberText(text: string, decimalSeparator: "." | "," = "."): ParsedNumber | null {
  const match = /^(\D*)([\d.,]+)(.*)$/s.exec(text);
  if (!match) return null;
  const [, prefix, digits, suffix] = match;

  const dotCount = countOf(digits, ".");
  const commaCount = countOf(digits, ",");

  let integerPart: string;
  let decimalPart = "";
  let thousandsSeparator: "." | "," | null = null;
  let usedDecimalSeparator: "." | "," = decimalSeparator;

  if (dotCount === 0 && commaCount === 0) {
    integerPart = digits;
  } else if (dotCount > 0 && commaCount > 0) {
    const thousandsChar = decimalSeparator === "." ? "," : ".";
    const decimalCount = decimalSeparator === "." ? dotCount : commaCount;
    if (decimalCount !== 1) return null; // ambiguous — more than one decimal point isn't a real number
    [integerPart, decimalPart] = splitOnLast(digits, decimalSeparator);
    if (!integerPart.includes(thousandsChar)) return null; // the other separator should only be grouping, before the decimal
    thousandsSeparator = thousandsChar;
    integerPart = integerPart.split(thousandsChar).join("");
  } else {
    const usedChar = dotCount > 0 ? "." : ",";
    const count = dotCount > 0 ? dotCount : commaCount;
    if (count > 1 || usedChar !== decimalSeparator) {
      integerPart = digits.split(usedChar).join("");
      thousandsSeparator = usedChar;
    } else {
      [integerPart, decimalPart] = splitOnLast(digits, usedChar);
      usedDecimalSeparator = usedChar;
    }
  }

  if (integerPart === "" || !/^\d+$/.test(integerPart)) return null;
  if (decimalPart !== "" && !/^\d+$/.test(decimalPart)) return null;

  const value = Number(`${integerPart}.${decimalPart || "0"}`);
  return { prefix, suffix, value, decimals: decimalPart.length, decimalSeparator: usedDecimalSeparator, thousandsSeparator };
}

function groupThousands(digits: string, separator: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export function formatNumber(
  value: number,
  parsed: Pick<ParsedNumber, "prefix" | "suffix" | "decimals" | "decimalSeparator" | "thousandsSeparator">,
): string {
  const fixed = value.toFixed(parsed.decimals);
  const [integerPart, decimalPart] = fixed.split(".");
  const grouped = parsed.thousandsSeparator ? groupThousands(integerPart, parsed.thousandsSeparator) : integerPart;
  const withDecimal = decimalPart ? `${grouped}${parsed.decimalSeparator}${decimalPart}` : grouped;
  return `${parsed.prefix}${withDecimal}${parsed.suffix}`;
}

/** Strong ease-out — starts fast, settles gently, matches an "arriving" value. */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - clamped, 3);
}

export function interpolate(start: number, end: number, elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return end;
  const progress = easeOutCubic(elapsedMs / durationMs);
  return start + (end - start) * progress;
}
