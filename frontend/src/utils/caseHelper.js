/**
 * Converts text to title/sentence case while preserving words or sentences
 * that the user explicitly typed in CAPITAL (e.g. using Caps Lock or Shift
 * for a particular word or whole sentence).
 *
 * Examples:
 * - "debankit agrofoods" -> "Debankit Agrofoods"
 * - "DEBANKIT AGROFOODS" -> "DEBANKIT AGROFOODS" (Caps Lock / uppercase preserved)
 * - "Debankit AGROFOODS Pvt Ltd" -> "Debankit AGROFOODS Pvt Ltd" (Caps Lock on specific word preserved)
 * - "WPA/20/2025" -> "WPA/20/2025"
 * - "UNION OF INDIA" -> "UNION OF INDIA"
 * - "uoi" -> "Uoi"
 * - "UOI" -> "UOI"
 * - "CD 01.02.2026" -> "CD 01.02.2026"
 */
export const toTitleCase = (str) => {
  if (!str) return str || '';
  if (typeof str !== 'string') return str;

  return str.replace(/\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b/g, (word) => {
    // If the word has 2 or more letters and is all uppercase, the user intentionally typed it in capital
    if (word.length >= 2 && word === word.toUpperCase()) {
      return word;
    }
    // If it has internal uppercase (e.g. McDonald, iPhone), preserve as is
    if (/[a-z]/.test(word) && /[A-Z]/.test(word.slice(1))) {
      return word;
    }
    // Capitalize first letter and keep the rest as typed
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
};

/**
 * Splits a case name into party1 and party2 if it contains versus variations:
 * -Vs-, -vs-, -VS-, Vs., vs., VS., Vs, vs, VS, v., V., or standalone 'v'.
 * Returns { p1, p2 } if matched, or null for "Others" / "In Re" cases.
 */
export const splitCaseName = (name) => {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim();
  // If explicitly starts with "In Re" or "In the Goods of", treat as Others
  if (/^(?:in\s+re[:\s]|in\s+the\s+goods\s+of)/i.test(trimmed)) {
    return null;
  }
  const match = trimmed.match(/^(.*?)(?:\s*(?:-Vs-|-vs-|-VS-|Vs\.|vs\.|VS\.|Vs|vs|VS|v\.|V\.)\s*|\s+v\s+)(.*)$/i);
  if (match && match[1] && match[2]) {
    return {
      p1: match[1].trim(),
      p2: match[2].trim()
    };
  }
  return null;
};

