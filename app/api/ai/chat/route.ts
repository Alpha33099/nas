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
    const { message, conversation } = validation.data;

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

    const systemPrompt = `You are Simwaya AI, the official 24/7 travel connectivity assistant for Simwaya (eSIM company for Pakistan and global destinations).

Help customers choose the right eSIM data plan, verify device compatibility, understand coverage, and guide them on instant activation.

Always use the live plan data, countries, and FAQ info provided below.
If a customer asks about a non-PTA device in Pakistan:
- Explain that factory-unlocked eSIM devices generally work for digital data roaming.
- Recommend confirming their specific model by chatting with us on Instagram (@${siteConfig.instagramUsername}).

FORMATTING: Keep responses concise, helpful, and beautifully formatted with bullet points and bold highlights.

--- SIMWAYA LIVE PLANS IN DATABASE ---
${JSON.stringify(plansData, null, 2)}

--- POPULAR DESTINATIONS ---
${JSON.stringify(countries.slice(0, 35), null, 2)}

--- COMMON QUESTIONS ---
${JSON.stringify(faqs, null, 2)}
`;

    // 1. Prioritize OpenRouter API
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
      try {
        const history = Array.isArray(conversation) ? conversation.slice(-8) : [];
        const messages = [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: message },
        ];

        const modelName = process.env.OPENROUTER_MODEL || "openrouter/free";

        const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openRouterKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages,
          }),
        });

        if (orRes.ok) {
          const orData = await orRes.json();
          let reply = orData?.choices?.[0]?.message?.content;
          if (reply && typeof reply === "string" && reply.trim().length > 0) {
            return NextResponse.json({ reply: reply.trim() });
          }
        } else {
          console.warn("OpenRouter returned error status:", orRes.status, await orRes.text());
        }
      } catch (err) {
        console.warn("OpenRouter fetch error:", err);
      }
    }

    // 2. Try Google Gemini API if a valid AI Studio key is provided
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.startsWith("AIzaSy")) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: `${systemPrompt}\n\nCustomer question: ${message}` }],
                },
              ],
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return NextResponse.json({ reply });
        }
      } catch (err) {
        console.warn("Gemini API call error:", err);
      }
    }

    // 3. Fallback reply
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
