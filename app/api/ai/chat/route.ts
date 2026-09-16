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

    // Direct Google Gemini API integration using Google AI Studio key
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (geminiKey) {
      const history = Array.isArray(conversation) ? conversation.slice(-8) : [];
      const contents = [
        ...history.map((h: { role: string; content?: string; text?: string }) => ({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content || h.text || "" }],
        })),
        {
          role: "user",
          parts: [{ text: message.trim() }],
        },
      ];

      // Primary: gemini-3.6-flash (current Google AI Studio production model)
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`;
        const geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemPrompt }],
            },
            contents,
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 2048,
            },
          }),
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply && reply.trim().length > 0) {
            return NextResponse.json({ reply: reply.trim() });
          }
        } else {
          // Fallback to gemini-flash-latest
          const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;
          const fallbackRes = await fetch(fallbackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemPrompt }],
              },
              contents,
              generationConfig: {
                temperature: 0.6,
                maxOutputTokens: 2048,
              },
            }),
          });

          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            const fallbackReply = fallbackData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (fallbackReply && fallbackReply.trim().length > 0) {
              return NextResponse.json({ reply: fallbackReply.trim() });
            }
          }
        }
      } catch (err) {
        console.warn("Google Gemini API call error:", err);
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
