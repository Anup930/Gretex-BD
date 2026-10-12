// Vercel Serverless Function: Secure Gemini AI Financial Copilot with Multi-Model Failover & Conversational Intelligence
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, error: "GEMINI_API_KEY missing in Vercel" });

  if (req.method === "GET") {
    return res.status(200).json({ success: true, message: "Era AI Copilot Online" });
  }

  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const { question, financialContext, chatHistory } = req.body || {};
    if (!question || !question.trim()) return res.status(400).json({ success: false, error: "Question cannot be empty" });

    // Format chat conversation memory if available
    let historyContext = "";
    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      historyContext = "\n\nRECENT CHAT HISTORY:\n" + chatHistory.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Era AI'}: ${m.text}`).join("\n");
    }

    const systemPrompt = `You are Era AI, a smart, conversational financial copilot and analyst for Gretex BillDesk (Gretex Group).

CORE RULES FOR NATURAL, DYNAMIC CONVERSATION:
1. ANSWER DIRECTLY & ACCURATELY:
   - Always answer the user's specific question directly, point-to-point, and accurately.
   - For greetings (e.g. "Hi", "Hello", "Kaise ho"), reply warmly and ask how you can help with bills, approvals, bank liquidity, or financial reports today. NEVER dump a repetitive financial report on a simple greeting!
   - For specific questions (e.g. "Kya koi payment due hai?", "HDFC balance kitna hai?", "Kaunsa bill pending hai?"), answer ONLY that question with exact names, dates, and amounts from the context.
   - Only provide a multi-point executive overview if the user explicitly asks for "summary", "overview", "report", or clicks quick report presets.

2. LANGUAGE ADAPTATION:
   - Match the user's language naturally!
   - If the user writes in Hindi or Hinglish (e.g. "Kya koi payment due hai abhi?", "HDFC balance batao"), reply in friendly, fluent, professional Hinglish.
   - If the user writes in English, reply in clean, professional English.

3. DYNAMIC METRICS & CHARTS (NEVER FORCE THEM):
   - "kpiCards": Return 2-3 cards ONLY if metrics/numbers directly answer or enrich the user's question. For greetings or simple single-fact questions, return an empty array [].
   - "chart": Return a chart ONLY if the user explicitly asks for charts, spend breakdowns, comparisons, or visual reports. If a chart is not requested or relevant, return null.

4. REAL DATA USAGE:
   - Strictly use the LIVE FINANCIAL CONTEXT below. Use exact figures (bills, vendors, companies, amounts in INR ₹, due dates, bank accounts).

LIVE FINANCIAL CONTEXT:
${financialContext ? JSON.stringify(financialContext, null, 2) : "Standard treasury context"}
${historyContext}

USER QUESTION:
${question}

OUTPUT FORMAT (STRICT VALID JSON ONLY, NO EXTRA CODEBLOCKS):
{
  "reply": "Your conversational answer in markdown (use bold, bullets, or paragraphs as appropriate).",
  "kpiCards": [],
  "chart": null
}`;

    // Priority order: lite models first (fast & reliable), then standard flash
    const models = [
      "gemini-flash-lite-latest",
      "gemini-2.5-flash-lite",
      "gemini-flash-latest",
      "gemini-2.0-flash"
    ];

    let lastError = null;

    for (const m of models) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;

        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
              temperature: 0.7
            }
          })
        });

        const data = await response.json();

        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          const rawText = data.candidates[0].content.parts[0].text;
          const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
          let parsed;
          try {
            parsed = JSON.parse(cleanJson);
          } catch (e) {
            parsed = { reply: rawText, kpiCards: [], chart: null };
          }
          return res.status(200).json({ success: true, modelUsed: m, data: parsed });
        }

        if (data.error) {
          lastError = data.error.message;
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    return res.status(500).json({ success: false, error: lastError || "All models busy" });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
