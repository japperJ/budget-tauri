// Auto-categorization: keyword rules + learning from existing categorizations.

export type Category = { id: number; name: string; type: string };
export type Example = { description: string; categoryId: number | null };

const RULES: { keywords: string[]; category: string }[] = [
  { keywords: ["løn"], category: "Løn" },
  { keywords: ["husleje", "realkredit", "ejendomsskat", "grundejer", "hus- indbo", "hus indbo"], category: "Bolig" },
  { keywords: ["rema", "netto", "føtex", "coop", "brugsen", "lidl", "fakta", "bilka", "aldi", "365 ", "irma", "meny", "mad", "frugt", "mejeri", "kød", "fisk", "bager", "cafe", "restaurant", "pizza", "burger", "mcd", "mcdonald", "rhodos", "fru jensen", "hellofresh", "mosters ishus", "spisestedet", "kantinen", "nallan", "mejeriet", "kvickly", "foetex", "føtex"], category: "Mad & dagligvarer" },
  { keywords: ["dsb", "pendler", "benzin", "diesel", "bilvask", "dæk", "ok ev", "tesla", "circle k", "shell", "q8", "transport", "bil forsikring", "bilforsikring"], category: "Transport" },
  { keywords: ["norlys", "fur kraft", "eesy", "yousee", "aura", "vand", "kraftvarme", "energi", "fiber", "el", "gas", "kraft", "solbjerg vand", "skive vand", "aarhus vand", "vandværk", "vandvaerk"], category: "Forsyning" },
  { keywords: ["alka", "forsikring", "tryg", "topdanmark", "codan", "if forsikring"], category: "Forsikring" },
  { keywords: ["netflix", "spotify", "hbo", "disney", "underholdning", "biograf", "weekendtur", "ferie", "hotel", "pinenhus", "bryghuset", "cafe", "restaurant", "rhodos", "spisestedet", "event tickets", "musik", "spil", "games"], category: "Underholdning" },
  { keywords: ["jem", "harald nyborg", "bauhaus", "jysk", "proshop", "amazon", "amzn", "amz", "b-young", "thansen", "silvan", "stark", "davidsen", "normal", "matas", "jysk", "bauhaus"], category: "Hjem & have" },
  { keywords: ["tøj", "matas", "normal", "h&m", "zara"], category: "Tøj" },
  { keywords: ["apotek", "læge", "tandlæge", "sundhed", "hospital", "medicin"], category: "Sundhed" },
  { keywords: ["jyske realkredit", "jyske real", "realkredit", "skat", "renter", "rente"], category: "Bolig" },
];

const STOPWORDS = new Set(["mobilepay", "til", "bs", "vd", "og", "i", "på", "af", "for", "med", "den", "det", "en", "et", "the", "a", "an", "nr", "cvr", "aps", "a/s", "am", "ba"]);

function tokens(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-zæøå0-9]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

export function suggestCategoryName(description: string): string | null {
  const d = (description || "").toLowerCase();
  if (!d.trim()) return null;
  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (d.includes(kw.toLowerCase())) {
        return rule.category;
      }
    }
  }
  return null;
}

// Learn from existing categorized transactions by token similarity.
export function suggestFromExamples(description: string, examples: Example[]): number | null {
  const dTokens = tokens(description);
  if (dTokens.length === 0) return null;
  const dSet = new Set(dTokens);
  let best: { id: number; score: number } | null = null;
  for (const ex of examples) {
    if (!ex.categoryId) continue;
    const exTokens = tokens(ex.description);
    if (exTokens.length === 0) continue;
    const exSet = new Set(exTokens);
    // overlap count of significant tokens
    let overlap = 0;
    for (const t of dSet) if (exSet.has(t)) overlap++;
    if (overlap === 0) continue;
    // jaccard
    const union = new Set([...dSet, ...exSet]).size;
    const jaccard = overlap / union;
    // require at least one shared significant token and reasonable similarity
    if (overlap >= 1 && (jaccard >= 0.25 || overlap >= 2)) {
      const score = overlap + jaccard;
      if (!best || score > best.score) best = { id: ex.categoryId, score };
    }
  }
  return best ? best.id : null;
}

export function suggestCategoryId(
  description: string,
  categories: Category[],
  examples: Example[] = []
): number | null {
  // 1. keyword rules
  const name = suggestCategoryName(description);
  if (name) {
    const cat = categories.find((c) => c.name === name && c.type === "expense");
    if (cat) return cat.id;
    const inc = categories.find((c) => c.name === name && c.type === "income");
    if (inc) return inc.id;
  }
  // 2. learn from existing categorizations
  const fromEx = suggestFromExamples(description, examples);
  if (fromEx) return fromEx;
  return null;
}