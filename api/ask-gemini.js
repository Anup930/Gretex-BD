// Vercel Serverless Function: Secure Gemini AI Financial Analyst (gemini-flash-latest)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, error: "GEMINI_API_KEY missing in Vercel" });

  if (req.method === "GET") {
    return res.status(200).json({ success: true, message: "AI Analyst Engine Online (gemini-flash-latest)" });
  }

  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const { question, financialContext } = req.body || {};
    if (!question || !question.trim()) return res.status(400).json({ success: false, error: "Question cannot be empty" });

    const systemPrompt = `You are the Gretex BillDesk Senior Financial AI Analyst.
Company: Gretex Group (Treasury & Corporate Accounts).
Tone: Highly professional, proactive, executive financial controller.
Respond in clear, structured format (English or natural Hinglish matching user prompt).
Always provide actionable insights, concrete INR (₹) numbers, statutory MSME 45-day warnings, and working capital advice.

LIVE SYSTEM FINANCIAL CONTEXT:
${financialContext ? JSON.stringify(financialContext, null, 2) : "Standard treasury context"}

USER QUESTION:
${question}

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "reply": "Your clear conversational explanation formatted with markdown bullet points.",
  "kpiCards": [
    { "title": "Metric Name", "value": "₹...", "sub": "Brief context", "status": "success|warning|danger" }
  ],
  "chart": {
    "type": "bar|pie|none",
    "title": "Chart Title",
    "labels": ["Label 1", "Label 2"],
    "values": [100, 200]
  }
}`;

    // Official perpetual alias: gemini-flash-latest
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ success: false, error: data.error.message });

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      parsed = { reply: rawText, kpiCards: [], chart: { type: "none" } };
    }

    return res.status(200).json({ success: true, modelUsed: "gemini-flash-latest", data: parsed });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
