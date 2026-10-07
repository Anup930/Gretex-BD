// Vercel Serverless Function: Secure Gemini AI Financial Analyst with Smart Fallback
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: "GEMINI_API_KEY missing in Vercel" });

    const { question, financialContext } = req.body || {};
    if (!question || !question.trim()) return res.status(400).json({ success: false, error: "Question cannot be empty" });

    const systemPrompt = `You are the Gretex BillDesk Senior Financial AI Analyst.
Company: Gretex Group (Treasury & Accounts). Tone: Highly professional, executive financial controller.
Provide clear numbers in INR, statutory MSME 45-day warnings, and working capital advice.

LIVE FINANCIAL CONTEXT:
${financialContext ? JSON.stringify(financialContext, null, 2) : "Standard treasury context"}

USER QUESTION:
${question}

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "reply": "Your clear conversational explanation with markdown bullet points.",
  "kpiCards": [
    { "title": "Metric Name", "value": "₹...", "sub": "Note", "status": "success" }
  ],
  "chart": {
    "type": "bar",
    "title": "Summary Chart",
    "labels": ["Approved", "Liquidity", "Overdue"],
    "values": [100, 200, 50]
  }
}`;

    // Cascading model list to ensure 100% uptime even during Google spikes
    const modelsToTry = [
      "gemini-2.0-flash-lite",
      "gemini-1.5-flash-8b",
      "gemini-3.8-flash"
    ];

    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }]
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
            parsed = { reply: rawText, kpiCards: [], chart: { type: "none" } };
          }
          return res.status(200).json({ success: true, modelUsed: model, data: parsed });
        }

        if (data.error) {
          lastError = data.error.message;
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    return res.status(500).json({ success: false, error: lastError || "All models busy" });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
