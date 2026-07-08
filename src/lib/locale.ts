export type Locale = "en" | "zh";

export const defaultLocale: Locale = "en";

export function parseLocale(value: unknown): Locale {
  return value === "zh" ? "zh" : "en";
}
