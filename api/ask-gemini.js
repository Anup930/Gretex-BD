// Vercel Serverless Function: Secure Gemini AI Financial Analyst (Production v1 Engine)
export default async function handler(req, res) {
  // CORS Headers for secure cross-origin communication
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        error: "GEMINI_API_KEY environment variable is not configured in Vercel settings." 
      });
    }

    const { question, financialContext } = req.body || {};
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, error: "Question cannot be empty." });
    }

    // Dynamic prompt with live system financial state
    const systemPrompt = `You are the Gretex BillDesk Senior Financial AI Analyst.
Company: Gretex Group (Treasury & Corporate Accounts).
Tone: Highly professional, executive, financial controller.
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
    { "title": "Metric Name", "value": "₹... or %", "sub": "Brief context", "status": "success|warning|danger" }
  ],
  "chart": {
    "type": "bar|pie|none",
    "title": "Chart Title",
    "labels": ["Label 1", "Label 2"],
    "values": [100, 200]
  }
}`;

    // Production v1 endpoints to bypass beta high-demand bottlenecks
    const endpointsToTry = [
      { ver: "v1", model: "gemini-2.0-flash" },
      { ver: "v1", model: "gemini-1.5-flash" },
      { ver: "v1beta", model: "gemini-2.0-flash-lite" },
      { ver: "v1beta", model: "gemini-1.5-flash-8b" }
    ];

    let lastError = null;

    for (const ep of endpointsToTry) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/${ep.ver}/models/${ep.model}:generateContent?key=${apiKey}`;

        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: systemPrompt }]
              }
            ]
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
          return res.status(200).json({ 
            success: true, 
            modelUsed: ep.model, 
            data: parsed 
          });
        }

        if (data.error) {
          lastError = data.error.message;
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    return res.status(500).json({ success: false, error: lastError || "All AI models currently busy" });

  } catch (error) {
    console.error("Vercel AI Analyst Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
