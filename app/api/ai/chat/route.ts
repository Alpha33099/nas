import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { countries } from "@/data/countries";
import { devices } from "@/data/devices";
import { faqs } from "@/data/faqs";
import { siteConfig } from "@/config/site";
import { AiChatSchema, validateBody } from "@/lib/security/schemas";
import { getClientIp, checkStandardRateLimit } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/errors";

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);

  try {
    // 1. Public rate limiting
    const rateCheck = checkStandardRateLimit("public", clientIp);
    if (!rateCheck.allowed) {
      return rateCheck.response;
    }

    const rawBody = await req.json();

    // 2. Strict Schema Validation
    const validation = validateBody(AiChatSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }
    const { message, conversation, history: rawHistory } = validation.data as any;

    // Fetch live plans from database for AI context
    let plansData: any[] = [];
    try {
      plansData = await sql`
        SELECT name, data_amount_gb, price, validity_days, description, is_on_sale, sale_price
        FROM plans_catalog
        WHERE is_active IS NOT FALSE
        ORDER BY data_amount_gb ASC
      `;
    } catch {
      // ignore
    }

    const systemPrompt = `You are Simvaya AI, the official 24/7 travel connectivity assistant for Simvaya (premium eSIM provider for global travelers and Pakistan).

ROLE & TONE:
Act like a friendly, intelligent travel concierge. Keep replies structured, concise, and beautifully formatted — just like ChatGPT.

FORMATTING RULES (VERY IMPORTANT):
1. **Headings**: Use clean markdown headings (e.g. \`### 🌟 Top Recommendations\`, \`### 📱 Compatibility\`, \`### 💡 Quick Summary\`).
2. **Bullets & Bold**: Use bold text for plan names, data amounts, and prices (e.g. **5GB ($14.99)** for 21 days). Always use bullet points with bold key labels.
3. **No Walls of Text**: Keep paragraphs short (1-2 sentences). Structure with bullet points and bold highlights for quick scanning on mobile.
4. **Hotspot & Features**: Mention that Personal Hotspot, Google Maps, and WhatsApp are fully supported on all plans.
5. **Non-PTA Devices in Pakistan**: If asked about Pakistan or non-PTA phones, explain that factory-unlocked eSIM phones can roam and use data seamlessly without PTA tax.
6. **Call to Action**: Conclude with a clear, friendly action step:
   - "👉 **How to Order:** Click **Buy Now** on this page or chat with us on Instagram **@${siteConfig.instagramUsername}** for instant activation!"

--- SIMVAYA AVAILABLE PLANS ---
${JSON.stringify(plansData, null, 2)}

--- POPULAR DESTINATIONS ---
${JSON.stringify(countries.slice(0, 30), null, 2)}

--- FREQUENTLY ASKED QUESTIONS ---
${JSON.stringify(faqs.slice(0, 15), null, 2)}
`;

    // Direct Google Gemini API integration using Google AI Studio key
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (geminiKey) {
      const pastMessages = Array.isArray(conversation)
        ? conversation
        : Array.isArray(rawHistory)
        ? rawHistory
        : [];
      const trimmedHistory = pastMessages.slice(-8);

      const contents = [
        ...trimmedHistory.map((h: any) => ({
          role: (h.role === "assistant" || h.role === "model" || h.sender === "ai") ? "model" : "user",
          parts: [{ text: h.content || h.text || "" }],
        })),
        {
          role: "user",
          parts: [{ text: message.trim() }],
        },
      ];

      // Ultra-fast Flash models prioritized for sub-2-second response latency
      const candidateModels = [
        "gemini-3.5-flash-lite",
        "gemini-flash-lite-latest",
        "gemini-3.8-flash",
        "gemini-3.6-flash",
      ];

      for (const modelName of candidateModels) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
          const geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemPrompt }],
              },
              contents,
              generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 850,
              },
            }),
          });

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (reply && reply.trim().length > 0) {
              return NextResponse.json({ reply: reply.trim() });
            }
          }
        } catch (err) {
          console.warn(`Google Gemini API (${modelName}) error:`, err);
        }
      }
    }

    // Fallback reply if API is down or key not set
    return NextResponse.json({
      reply: "Thank you for reaching out! You can explore all our high-speed eSIM plans in our Plans catalog, or chat directly with our team on Instagram (@simvaya21) to get your eSIM QR code instantly!",
    });
  } catch (error) {
    return safeErrorResponse(error, {
      clientMessage: "Simwaya AI is temporarily unavailable. Please try again shortly.",
      context: { clientIp },
    });
  }
}
