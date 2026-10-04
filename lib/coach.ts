export const TOPICS = [
  "Describe your favorite childhood memory and why it matters to you.",
  "Should remote work remain permanent for modern technology companies?",
  "Explain a complex concept to someone who has never heard of it before.",
  "What is one invention that significantly changed human history and how?",
  "How can individuals realistically contribute to combating climate change?",
  "Discuss the pros and cons of artificial intelligence in daily education.",
  "If you could master any skill overnight, what would it be and why?",
  "What makes a great leader, and what leadership styles are most effective?",
  "Share a book, movie, or song that profoundly shifted your perspective.",
  "How do you define personal success, and how has that definition evolved?",
];

export const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can\'t', 'cannot', 'could',
  'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for',
  'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll',
  'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d',
  'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s', 'me',
  'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s',
  'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
  'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which',
  'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d',
  'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
]);

export interface CoachReport {
  totalWords: number;
  wpm: number;
  paceLabel: 'Too Slow' | 'Good' | 'Too Fast';
  totalFillers: number;
  fillerRatePerMin: number;
  fillersList: { word: string; count: number }[];
  pauseCount: number;
  topWords: { word: string; count: number }[];
  uniqueWordRatio: number;
  overallScore: number;
  scoreBreakdown: string;
  tips: string[];
}

export function calculateCoachReport(text: string, durationSeconds: number, pauseCount: number): CoachReport {
  const normalized = text.toLowerCase();
  const words = normalized.match(/[a-zA-Z0-9'-]+/g) || [];
  const totalWords = words.length;
  const effectiveSecs = Math.max(durationSeconds, 1);
  const durationMins = effectiveSecs / 60;

  const wpm = totalWords > 0 ? Math.round(totalWords / durationMins) : 0;
  let paceLabel: 'Too Slow' | 'Good' | 'Too Fast' = 'Good';
  if (wpm < 110) paceLabel = 'Too Slow';
  else if (wpm > 160) paceLabel = 'Too Fast';

  // Fillers
  const fillersCountMap: Record<string, number> = {};
  const youKnowMatches = normalized.match(/\byou\s+know\b/g);
  if (youKnowMatches && youKnowMatches.length > 0) {
    fillersCountMap['you know'] = youKnowMatches.length;
  }
  const singleFillers = ['um', 'uh', 'like', 'basically', 'actually'];
  for (const f of singleFillers) {
    const matches = normalized.match(new RegExp(`\\b${f}\\b`, 'g'));
    if (matches && matches.length > 0) {
      fillersCountMap[f] = matches.length;
    }
  }

  const fillersList = Object.entries(fillersCountMap).map(([word, count]) => ({ word, count }));
  const totalFillers = fillersList.reduce((acc, curr) => acc + curr.count, 0);
  const fillerRatePerMin = Math.round((totalFillers / durationMins) * 10) / 10;

  // Top 5 words
  const freqMap: Record<string, number> = {};
  words.forEach(w => {
    const clean = w.replace(/^[^\w']+|[^\w']+$/g, '');
    if (clean && !STOPWORDS.has(clean) && !/^\d+$/.test(clean)) {
      freqMap[clean] = (freqMap[clean] || 0) + 1;
    }
  });

  const topWords = Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));

  // Unique word ratio
  const uniqueCount = new Set(words).size;
  const uniqueWordRatio = totalWords > 0 ? Math.round((uniqueCount / totalWords) * 100) / 100 : 0;

  // Score computation (starts at 100)
  let score = 100;
  let pacePenalty = 0;
  if (wpm < 110) {
    pacePenalty = Math.min(30, Math.round((110 - wpm) * 0.4));
  } else if (wpm > 160) {
    pacePenalty = Math.min(30, Math.round((wpm - 160) * 0.4));
  }
  score -= pacePenalty;

  const fillerPenalty = Math.min(25, Math.round(fillerRatePerMin * 3));
  score -= fillerPenalty;

  const pausePenalty = Math.min(20, Math.max(0, pauseCount - Math.round(durationMins * 2)) * 3);
  score -= pausePenalty;

  let vocabPenalty = 0;
  if (totalWords >= 20) {
    if (uniqueWordRatio < 0.4) vocabPenalty = 15;
    else if (uniqueWordRatio < 0.55) vocabPenalty = 8;
  }
  score -= vocabPenalty;

  const overallScore = Math.max(10, Math.min(100, score));
  const scoreBreakdown = `Base: 100 | Pace: -${pacePenalty} | Fillers: -${fillerPenalty} | Pauses: -${pausePenalty} | Vocab: -${vocabPenalty}`;

  // Plain-language tips
  const tips: string[] = [];
  if (wpm < 110) {
    tips.push("Speed up slightly toward a conversational rhythm of 120-150 WPM to maintain momentum.");
  } else if (wpm > 160) {
    tips.push("Slow down your delivery slightly to allow your audience time to absorb complex thoughts.");
  } else {
    tips.push("Your conversational pacing was well-balanced and natural.");
  }

  if (fillerRatePerMin > 2) {
    tips.push("Practice replacing verbal crutches like 'um' or 'like' with deliberate, silent pauses.");
  }

  if (pauseCount > durationMins * 3) {
    tips.push("Several long pauses occurred (>2s); try linking your thoughts smoothly with transitional phrases.");
  }

  if (uniqueWordRatio < 0.5 && totalWords > 30) {
    tips.push("Diversify your vocabulary with synonyms to enhance expressiveness and interest.");
  }

  if (tips.length < 2) {
    tips.push("Maintain steady breath support to sustain consistent vocal clarity throughout your speech.");
  }

  return {
    totalWords,
    wpm,
    paceLabel,
    totalFillers,
    fillerRatePerMin,
    fillersList,
    pauseCount,
    topWords,
    uniqueWordRatio,
    overallScore,
    scoreBreakdown,
    tips: tips.slice(0, 3),
  };
}
