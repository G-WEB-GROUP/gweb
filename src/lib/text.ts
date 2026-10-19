// "EAT REAL BREAD. SUPPORT YOUR LOCAL BAKER." -> "Eat real bread. Support your local baker."
// Display only: the stored text stays as on the original site.
export const sentenceCase = (s: string) =>
  s.toLowerCase().replace(/(^|[.!?:]\s+)([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());
