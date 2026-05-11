import { getData, STORAGE_KEYS } from './storage';

// AI PROVIDER CONFIG
// Using EXPO_PUBLIC_ prefix so it's accessible in the app
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || ''; 
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface AIInsight {
  id: string;
  title: string;
  msg: string;
  icon: string;
  color: string;
  xpMultiplier?: number;
}

/**
 * Gathers current user state into a prompt-friendly context (now with history for predictive)
 */
async function getAIContext() {
  const [tasksData, habitsData, gamificationData, journalData] = await Promise.all([
    getData(STORAGE_KEYS.TASKS),
    getData(STORAGE_KEYS.HABITS),
    getData(STORAGE_KEYS.GAMIFICATION),
    getData(STORAGE_KEYS.JOURNAL),
  ]);

  const tasks = Array.isArray(tasksData) ? tasksData : [];
  const habits = Array.isArray(habitsData) ? habitsData : [];
  const journal = Array.isArray(journalData) ? journalData : [];
  const gamification = (gamificationData || {}) as any;

  const todayStr = new Date().toLocaleDateString();
  const tasksCompleted = tasks.filter((t: any) => t.status === 'done').length;
  const tasksPending = tasks.filter((t: any) => t.status !== 'done').length;
  
  // Get 7-day habit history for pattern detection
  const habitHistory = habits.map((h: any) => ({
    name: h.name,
    completionRate: h.completedDates?.length || 0,
    isDoneToday: h.completedDates?.includes(todayStr) || false,
    last7Days: Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toLocaleDateString();
      return h.completedDates?.includes(dStr) ? 1 : 0;
    })
  }));

  const lastMood = journal[0]?.mood || 'neutral';

  return {
    time: new Date().toLocaleTimeString(),
    day: new Date().toLocaleDateString('id-ID', { weekday: 'long' }),
    tasks: { completed: tasksCompleted, pending: tasksPending },
    habits: habitHistory,
    level: gamification.level || 1,
    xp: gamification.totalXP || 0,
    mood: lastMood
  };
}

/**
 * Fetches Smart Insights from Groq AI
 */
export async function fetchAIInsights(): Promise<AIInsight[]> {
  if (!GROQ_API_KEY) {
    // Fallback if no API key is provided yet
    return [
      { id: '1', title: 'AI Offline', msg: 'Masukkan Groq API Key di lib/ai.ts untuk mengaktifkan AI Life Coach!', icon: 'error-outline', color: '#f87171' },
      { id: '2', title: 'Saran Klasik', msg: 'Selesaikan satu tugas prioritas hari ini untuk mulai momentum.', icon: 'bolt', color: '#fbbf24' }
    ];
  }

  const context = await getAIContext();
  
  const systemPrompt = `
    You are 'SelfOne AI', a Gen Z life coach. You are punchy, direct, and slightly roasting if the user is lazy, but extremely hype when they win. 
    Analyze the user data and provide exactly 3-4 short insights.
    
    CRITICAL: 
    1. Predictive Anti-Mager: Look at 'last7Days' in habits. If you see a pattern of 0s on specific days, warn the user and give a 1.5x XP multiplier to break the pattern.
    2. Weekly Context: If it's Sunday, provide a "Weekly Boost/Roast" as one of the insights.
    
    Format response as a JSON array of objects: { id, title, msg, icon, color, xpMultiplier }.
    If an insight is an 'Anti-Mager' boost, add "xpMultiplier": 1.5 to that object.
    Icons MUST use kebab-case (e.g. 'check-circle', 'access-time', 'fitness-center') from MaterialIcons.
    Colors must be Hex codes that look premium.
    Language: Indonesian (Gaul/Gen Z style).
  `;

  const userPrompt = `
    Current Status:
    - Day: ${context.day}
    - Time: ${context.time}
    - Tasks: ${context.tasks.completed} done, ${context.tasks.pending} pending.
    - Habits (Last 7 Days): ${JSON.stringify(context.habits)}
    - Level: ${context.level} (${context.xp} XP).
    - Last Mood: ${context.mood}.
    
    Give me some spicy but helpful insights! Focus on predicting laziness based on their habit history.
  `;

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Groq API Error Status:', response.status, errorData);
      throw new Error(`Groq API Error: ${response.status}`);
    }

    const data = await response.json();
    
    // Safety check for choices structure
    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error('Unexpected Groq Response Format:', data);
      throw new Error('Invalid AI response format');
    }

    const content = JSON.parse(data.choices[0].message.content);
    
    // Support both { insights: [] } and [] formats
    return Array.isArray(content) ? content : (content.insights || []);
  } catch (e) {
    console.error('AI Insight Error:', e);
    // Return empty array or localized error card instead of crashing
    return [
      { 
        id: 'err-' + Date.now(), 
        title: 'AI Sedang Istirahat', 
        msg: 'Cek koneksi atau API Key Groq lo di lib/ai.ts, brok.', 
        icon: 'cloud-off', 
        color: '#94a3b8' 
      }
    ];
  }
}

/**
 * Fetches AI Analysis for a specific journal entry
 */
export async function analyzeJournalEntry(content: string): Promise<string> {
  if (!GROQ_API_KEY) return "AI Coach sedang offline. Masukkan API Key di lib/ai.ts untuk melihat analisis.";

  const systemPrompt = `
    You are 'SelfOne AI', a Gen Z life coach. 
    Analyze the following journal entry. 
    If it's lazy/negative, give a spicy roast. 
    If it's productive/positive, give a hype boost. 
    Keep it under 30 words. Indonesian (Gen Z style).
  `;

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: content }
        ]
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (e) {
    return "Gagal dapet pencerahan dari AI brok.";
  }
}
/**
 * Processes a journal entry to get sentiment and coaching reflection
 */
export async function processJournalAI(content: string): Promise<{ mood: string, reflection: string }> {
  if (!GROQ_API_KEY) return { mood: 'neutral', reflection: '' };

  const systemPrompt = `
    You are 'SelfOne AI', a Gen Z life coach & psychologist. 
    Analyze this journal entry and return JSON: { "mood": "great|good|neutral|bad|terrible", "reflection": "..." }.
    Reflection: Give short coaching advice or a supportive/spicy comment (< 25 words).
    Language: Indonesian (Gen Z style).
    JSON format strictly.
  `;

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: content }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (e) {
    console.error('Journal AI error:', e);
    return { mood: 'neutral', reflection: 'Gagal dapet pencerahan AI, tapi tetep semangat brok!' };
  }
}

/**
 * Generates 3 reflection prompts for the user based on their day
 */
export async function getJournalPrompts(): Promise<string[]> {
  if (!GROQ_API_KEY) return [
    "Apa pencapaian terbaikmu hari ini?",
    "Apa tantangan terbesar yang kamu hadapi?",
    "Satu hal yang kamu syukuri hari ini?"
  ];

  const context = await getAIContext();
  const systemPrompt = `
    You are 'SelfOne AI'. Generate 3 short, punchy reflection questions for a journal.
    Context: Day is ${context.day}, Tasks: ${context.tasks.pending} pending.
    Language: Indonesian (Gen Z style).
    Return JSON array: ["...", "...", "..."]
  `;

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return Array.isArray(result) ? result : (result.prompts || result.questions || []);
  } catch (e) {
    return ["Apa hal paling berkesan hari ini?", "Lagi ngerasa gimana sekarang?", "Besok pengen ngapain?"];
  }
}
