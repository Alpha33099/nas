import { NextResponse } from "next/server";
import { verifyCustomerToken } from "@/lib/auth";
import { sql } from "@/lib/db";
import { calculateCurrentUsage } from "@/lib/usage";

export async function POST(req: Request) {
  try {
    const customer = await verifyCustomerToken();
    if (!customer) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to your Simvaya account." },
        { status: 401 }
      );
    }

    const { message, history = [] } = await req.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    // 1. Fetch live plans catalog from DB so AI ALWAYS knows every single plan (including newly added packages like 16GB!)
    let plansListText = "";
    let livePlans: any[] = [];
    try {
      livePlans = (await sql`
        SELECT name, data_amount_gb, price, validity_days, description
        FROM plans_catalog
        ORDER BY data_amount_gb ASC
      `) as any[];

      if (livePlans && livePlans.length > 0) {
        plansListText = livePlans
          .map(
            (p) =>
              `- ${p.name} (${Number(p.data_amount_gb)}GB, $${Number(p.price).toFixed(2)}, ${p.validity_days} Days validity): ${p.description || "High-speed global roaming data"}`
          )
          .join("\n");
      }
    } catch (dbErr) {
      console.warn("Could not load plans catalog from DB for AI:", dbErr);
    }

    if (!plansListText) {
      plansListText = "- 1GB ($4.99, 7 days)\n- 3GB ($9.99, 15 days)\n- 5GB ($14.99, 21 days)\n- 10GB ($24.99, 30 days)\n- 20GB ($39.99, 30 days)\n- 50GB ($69.99, 30 days)";
    }

    // 2. Fetch logged-in customer's active subscription plans and live data
    let customerPlanContext = "The customer currently has no active travel eSIM plans.";
    try {
      const customerPlans = await sql`
        SELECT cp.id, cp.total_gb, cp.used_gb, cp.manual_used_gb, cp.manual_updated_at,
               cp.daily_burn_rate, cp.start_date, cp.expiry_date, cp.status,
               pc.name as plan_name
        FROM customer_plans cp
        JOIN plans_catalog pc ON cp.plan_catalog_id = pc.id
        WHERE cp.customer_id = ${customer.id} AND cp.status = 'active'
      `;
      if (customerPlans.length > 0) {
        const planDetails = (customerPlans as any[]).map((p) => {
          const usage = calculateCurrentUsage(p);
          const daysLeft = Math.max(0, Math.ceil((new Date(p.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          return `- ${p.plan_name}: ${usage.remainingGb.toFixed(2)} GB remaining out of ${Number(p.total_gb)} GB (${usage.currentUsedGb.toFixed(2)} GB used, expires in ${daysLeft} days on ${new Date(p.expiry_date).toISOString().split("T")[0]})`;
        });
        customerPlanContext = `CUSTOMER'S ACTIVE SUBSCRIPTIONS (Live Account Data):\n${planDetails.join("\n")}`;
      }
    } catch (custErr) {
      console.warn("Could not load customer plans for AI:", custErr);
    }

    const systemPrompt = `You are the official Simvaya AI Travel Assistant. Your goal is to guide travelers in selecting the ideal eSIM global data package, answer roaming queries, and provide quick setup tips.

LANGUAGE & TONE CAPABILITIES:
- MULTILINGUAL & ROMAN URDU: You understand and speak fluent, natural Roman Urdu, standard Urdu, English, and Arabic!
- If the customer asks questions in Roman Urdu (e.g. "bhai konsa plan acha hai?", "dubai k liye konsa package lu?", "10 din k liye kitna data chahiye?", "hotspot chalega kya?"), always reply naturally and warmly in friendly Roman Urdu!
- If the customer asks in English, reply in English. Match whichever language or mix (Hinglish/Urdish) they use.
- Keep answers concise, clear, and travel-savvy (2-4 sentences max per answer).
- NEVER use yellow emojis (no 📡, ⚠️, ✈️, 👋, etc.). Use clean bullet points or standard punctuation.
- Always encourage them to tap 'Buy on IG' or DM @simvaya21 on Instagram to activate.

${customerPlanContext}

CURRENT LIVE SIMVAYA PLANS CATALOG (Directly from database - always use these exact plans and prices):
${plansListText}

GLOBAL COVERAGE & NETWORKS:
- High-speed 4G LTE and 5G in 140+ countries (USA, UK, Europe, UAE/Dubai, Saudi Arabia, Turkey, Southeast Asia, etc.).
- Automatically connects to premier Tier-1 local carrier towers upon arrival.

KEY TECHNICAL SPECIFICATIONS:
- APN: "globaldata" (Username & Password left empty).
- Hotspot / Tethering: 100% permitted across all plans with no extra charges.
- Roaming: "Data Roaming" MUST be toggled ON for the Simvaya eSIM line once landing at destination.
- Compatibility: Any factory-unlocked iPhone (XS or newer) or eSIM-compatible Android (Samsung S20+, Pixel 3+, etc.).

ORDERING & SUPPORT:
- Customers purchase by clicking "Buy on IG" on any plan card or contacting Instagram DM @simvaya21.
- Instant activation QR code and manual activation strings are delivered in minutes.`;

    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();

    console.log(`[AI Chat] Keys detected - Gemini: ${Boolean(geminiKey)}, OpenRouter: ${Boolean(openrouterKey)}`);

    // If neither key is detected in process.env
    if (!geminiKey && !openrouterKey) {
      console.warn("[AI Chat] No API keys detected in process.env. Dev server restart may be needed.");
      return NextResponse.json({
        reply: "Simvaya AI is almost ready! Please restart your Next.js development server (press Ctrl+C in your terminal, then run 'npm run dev') so it loads your newly added API key from .env.local.",
        isConfigured: false,
      });
    }

    // 1. If OpenRouter Key is provided, use OpenRouter
    if (openrouterKey) {
      const model = process.env.OPENROUTER_MODEL?.trim() || "google/gemini-2.0-flash-exp:free";
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.map((h: { role: string; text: string }) => ({
          role: h.role === "user" ? "user" : "assistant",
          content: h.text,
        })),
        { role: "user", content: message.trim() },
      ];

      try {
        const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openrouterKey}`,
            "HTTP-Referer": "https://simvaya.com",
            "X-Title": "Simvaya Travel Assistant",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.6,
            max_tokens: 1500,
          }),
        });

        if (orRes.ok) {
          const orData = await orRes.json();
          const reply = orData.choices?.[0]?.message?.content;
          if (reply) {
            return NextResponse.json({ reply: reply.trim(), isConfigured: true });
          }
        } else {
          const errText = await orRes.text();
          console.error("[OpenRouter Error]", orRes.status, errText);
        }
      } catch (e) {
        console.error("[OpenRouter Exception]", e);
      }
    }

    // 2. If Gemini Key is provided, use Google Gemini API
    if (geminiKey) {
      const contents = [
        ...history.map((h: { role: string; text: string }) => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }],
        })),
        {
          role: "user",
          parts: [{ text: message.trim() }],
        },
      ];

      // Primary: gemini-3.6-flash (current active production model for new API keys)
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`;

      const geminiResponse = await fetch(geminiUrl, {
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

      if (geminiResponse.ok) {
        const data = await geminiResponse.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) {
          return NextResponse.json({ reply: candidate.trim(), isConfigured: true });
        }
      } else {
        const errText1 = await geminiResponse.text();
        console.warn("[Gemini 3.6 Error]", geminiResponse.status, errText1);

        // Fallback to gemini-flash-latest
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;
        const fallbackResponse = await fetch(fallbackUrl, {
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

        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate) {
            return NextResponse.json({ reply: candidate.trim(), isConfigured: true });
          }
        } else {
          const errText2 = await fallbackResponse.text();
          console.error("[Gemini fallback Error]", fallbackResponse.status, errText2);
        }
      }
    }

    // 3. Built-in intelligent fallback if API failed or quota hit
    return NextResponse.json({
      reply: generateOfflineFallback(message, livePlans),
      isConfigured: Boolean(geminiKey || openrouterKey),
    });
  } catch (error) {
    console.error("AI Chat API error:", error);
    return NextResponse.json(
      { error: "Unable to process travel query at this time." },
      { status: 500 }
    );
  }
}

// Built-in intelligent fallback when key is not yet set or during network outages
function generateOfflineFallback(userPrompt: string, livePlans: any[] = []): string {
  const lower = userPrompt.toLowerCase();
  const isRomanUrdu =
    lower.includes("bhai") ||
    lower.includes("kya") ||
    lower.includes("hai") ||
    lower.includes("konsa") ||
    lower.includes("din") ||
    lower.includes("chahiye") ||
    lower.includes("kaise") ||
    lower.includes("chalega");

  // Check if user specifically asks about any numeric GB plan in the live database (including 16GB!)
  for (const p of livePlans) {
    const gbNum = Number(p.data_amount_gb);
    if (lower.includes(`${gbNum}gb`) || lower.includes(`${gbNum} gb`)) {
      if (isRomanUrdu) {
        return `Ji bilkul! Hamare paas ${p.name} (${gbNum}GB) plan available hai sirf $${Number(p.price).toFixed(2)} mein, jiski validity ${p.validity_days} days hai. Isay order karne ke liye card par 'Buy on IG' dabayein ya direct Instagram @simvaya21 par message karein!`;
      }
      return `Yes! We have the ${p.name} plan (${gbNum}GB) available for $${Number(p.price).toFixed(2)} with ${p.validity_days} days validity. Tap 'Buy on IG' on the card or message @simvaya21 on Instagram to activate it instantly!`;
    }
  }

  if (lower.includes("10 day") || lower.includes("week") || lower.includes("7 day") || lower.includes("short") || lower.includes("10 din")) {
    if (isRomanUrdu) {
      return "10 din ke trip ke liye hamara 5GB ($14.99) ya 10GB ($24.99) plan best hai! Google Maps aur WhatsApp araam se chalega. Order karne ke liye 'Buy on IG' dabayein ya Instagram @simvaya21 par rabta karein.";
    }
    return "For a 7 to 10-day trip, our 3GB ($9.99) or 5GB ($14.99) plans are ideal! 5GB provides plenty of data for Google Maps, WhatsApp messaging, and social media. Tap 'Buy on IG' to order instantly.";
  }

  if (lower.includes("month") || lower.includes("30 day") || lower.includes("long") || lower.includes("heavy") || lower.includes("stream") || lower.includes("mahina")) {
    if (isRomanUrdu) {
      return "Pore maheene ya zyada data ke liye 10GB ($24.99) ya 20GB ($39.99) bundle behtareen hai. Hotspot bhi 100% allowed hai. Buy on IG dabayein!";
    }
    return "For trips up to 30 days or heavier usage, we recommend our 10GB ($24.99, ~$2.50/GB) or 20GB ($39.99, ~$2.00/GB) plans. Both support personal hotspot and Tier-1 5G roaming.";
  }

  if (lower.includes("hotspot") || lower.includes("tether") || lower.includes("share")) {
    if (isRomanUrdu) {
      return "Ji bilkul! Simvaya ke tamam plans par Hotspot aur Tethering 100% allowed hai, aap apne laptop aur doston ke sath internet share kar sakte hain.";
    }
    return "Yes! Personal Hotspot and tethering are 100% supported across all Simvaya plans with no restrictions. You can easily share your data with laptops or travel companions.";
  }

  if (lower.includes("apn") || lower.includes("activate") || lower.includes("setup") || lower.includes("install") || lower.includes("chalana")) {
    if (isRomanUrdu) {
      return "Setup intehai asaan hai: Phone Settings mein ja kar eSIM add karein, APN 'globaldata' check karein, aur destination pohanchte hi Data Roaming ON kar dein.";
    }
    return "Setup is simple: Add your eSIM in phone settings, ensure your APN is set to 'globaldata', and turn Data Roaming ON once you arrive at your destination.";
  }

  if (lower.includes("dubai") || lower.includes("saudi") || lower.includes("turkey") || lower.includes("europe") || lower.includes("usa") || lower.includes("country")) {
    if (isRomanUrdu) {
      return "Simvaya 140 se zyada mumalik (Dubai, Saudi, Turkey, UK, USA, Europe) mein high-speed 4G/5G provide karta hai. Kisi bhi plan par 'Buy on IG' dabayein!";
    }
    return "Simvaya provides coverage in over 140 countries including the UAE, Saudi Arabia, Turkey, USA, and across Europe with Tier-1 local carriers. Click 'Buy on IG' to get connected.";
  }

  if (isRomanUrdu) {
    return "Hamara sab se mashhoor package 5GB ($14.99, 21 Days) hai! Aur agar aap ko zyada data chahiye toh 10GB ya 16GB ($12.00, 50 Days) bhi available hai. Order ke liye Instagram @simvaya21 par rabta karein!";
  }

  return "Our most popular package is the 5GB bundle ($14.99 for 21 days), and we also have 10GB, 16GB ($12.00 for 50 days), and 20GB bundles! To order, click 'Buy on IG' on any plan or DM us on Instagram @simvaya21!";
}
