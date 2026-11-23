// Ordered so compound/longer abbreviations are expanded before the
// shorter abbreviations they contain (e.g. "Addl. CJM" before "CJM").
const JUDGE_ABBREVIATIONS = [
  { abbr: 'Ld.', full: 'Learned' },
  { abbr: 'Ct.', full: 'Court' },

  { abbr: 'Addl. CJM', full: 'Additional Chief Judicial Magistrate' },
  { abbr: 'ACJM', full: 'Additional Chief Judicial Magistrate' },
  { abbr: 'CJM', full: 'Chief Judicial Magistrate' },

  { abbr: 'Addl. Sessions J.', full: 'Additional Sessions Judge' },
  { abbr: 'ASJ', full: 'Additional Sessions Judge' },
  { abbr: 'Sessions J.', full: 'Sessions Judge' },

  { abbr: 'Pr. DJ', full: 'Principal District Judge' },
  { abbr: 'ADJ', full: 'Additional District & Sessions Judge' },

  { abbr: 'JM 1st Class', full: 'Judicial Magistrate of the First Class' },
  { abbr: 'JMFC', full: 'Judicial Magistrate of the First Class' },
  { abbr: 'JM 2nd Class', full: 'Judicial Magistrate of the Second Class' },
  { abbr: 'SDJM', full: 'Sub-Divisional Judicial Magistrate' },
  { abbr: 'JM', full: 'Judicial Magistrate' },

  { abbr: 'ACMM', full: 'Additional Chief Metropolitan Magistrate' },
  { abbr: 'CMM', full: 'Chief Metropolitan Magistrate' },
  { abbr: 'MM', full: 'Metropolitan Magistrate' },

  { abbr: 'EM', full: 'Executive Magistrate' },

  { abbr: 'Spl. Judge', full: 'Special Judge' },
  { abbr: 'Spl. Court', full: 'Special Court' },

  { abbr: 'CJ (Sr. Div)', full: 'Civil Judge (Senior Division)' },
  { abbr: 'CJ (Jr. Div)', full: 'Civil Judge (Junior Division)' },
  { abbr: 'Sr. Div', full: 'Senior Division' },
  { abbr: 'Jr. Div', full: 'Junior Division' },
];

// Grouped for the on-screen reference guide (not used for matching).
export const JUDGE_ABBREVIATION_GROUPS = [
  {
    title: 'General',
    items: [
      { abbr: 'Ld.', full: 'Learned' },
      { abbr: 'Ct.', full: 'Court' },
    ]
  },
  {
    title: 'District & Sessions Judiciary',
    items: [
      { abbr: 'Pr. DJ', full: 'Principal District Judge' },
      { abbr: 'ADJ', full: 'Additional District & Sessions Judge' },
      { abbr: 'Sessions J.', full: 'Sessions Judge' },
      { abbr: 'ASJ', full: 'Additional Sessions Judge' },
      { abbr: 'Addl. Sessions J.', full: 'Additional Sessions Judge' },
      { abbr: 'Spl. Judge', full: 'Special Judge' },
      { abbr: 'Spl. Court', full: 'Special Court' },
    ]
  },
  {
    title: 'Judicial Magistracy',
    items: [
      { abbr: 'CJM', full: 'Chief Judicial Magistrate' },
      { abbr: 'Addl. CJM / ACJM', full: 'Additional Chief Judicial Magistrate' },
      { abbr: 'SDJM', full: 'Sub-Divisional Judicial Magistrate' },
      { abbr: 'JM', full: 'Judicial Magistrate' },
      { abbr: 'JMFC / JM 1st Class', full: 'Judicial Magistrate of the First Class' },
      { abbr: 'JM 2nd Class', full: 'Judicial Magistrate of the Second Class' },
    ]
  },
  {
    title: 'Metropolitan Magistracy',
    items: [
      { abbr: 'CMM', full: 'Chief Metropolitan Magistrate' },
      { abbr: 'ACMM', full: 'Additional Chief Metropolitan Magistrate' },
      { abbr: 'MM', full: 'Metropolitan Magistrate' },
    ]
  },
  {
    title: 'Executive',
    items: [
      { abbr: 'EM', full: 'Executive Magistrate' },
    ]
  },
  {
    title: 'Civil Judiciary',
    items: [
      { abbr: 'CJ (Sr. Div)', full: 'Civil Judge (Senior Division)' },
      { abbr: 'CJ (Jr. Div)', full: 'Civil Judge (Junior Division)' },
      { abbr: 'Sr. Div', full: 'Senior Division' },
      { abbr: 'Jr. Div', full: 'Junior Division' },
    ]
  },
];

const abbrToRegex = (abbr) => {
  let pattern = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex special chars
  pattern = pattern.replace(/\\\./g, '\\.?\\s*'); // make periods optional
  pattern = pattern.replace(/ /g, '\\s+'); // flexible whitespace
  return new RegExp(`(?<![A-Za-z])${pattern}(?![A-Za-z])`, 'gi');
};

const COMPILED = JUDGE_ABBREVIATIONS.map(({ abbr, full }) => ({ abbr, regex: abbrToRegex(abbr), full }));

// Custom entries are tried first, so a user's own short form always wins over a built-in one.
// hiddenBuiltinAbbreviations lets a user permanently delete a built-in entry (case-insensitive).
export const expandJudgeAbbreviations = (text, customAbbreviations = [], hiddenBuiltinAbbreviations = []) => {
  if (!text || typeof text !== 'string') return text || '';
  const hiddenSet = new Set((hiddenBuiltinAbbreviations || []).map(a => a.toLowerCase()));
  const builtins = hiddenSet.size ? COMPILED.filter(({ abbr }) => !hiddenSet.has(abbr.toLowerCase())) : COMPILED;
  const compiled = customAbbreviations && customAbbreviations.length
    ? [
        ...customAbbreviations
          .filter(({ abbr, full }) => abbr && full)
          .map(({ abbr, full }) => ({ regex: abbrToRegex(abbr), full })),
        ...builtins
      ]
    : builtins;
  let result = text;
  compiled.forEach(({ regex, full }) => {
    result = result.replace(regex, full);
  });
  return result;
};
