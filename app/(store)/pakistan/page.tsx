import Link from "next/link";
import { Wifi, ShieldCheck, Smartphone, MessageCircle, Sparkles } from "lucide-react";
import { sql } from "@/lib/db";
import { PlanCard } from "@/components/PlanCard";
import { siteConfig } from "@/config/site";

export const revalidate = 60;

const instagramUrl = `https://ig.me/m/${siteConfig.instagramUsername}`;

export default async function PakistanPage() {
  let plans: any[] = [];
  try {
    plans = await sql`
      SELECT 
        id, 
        name, 
        data_amount_gb, 
        price, 
        validity_days, 
        description, 
        instagram_message, 
        is_highlighted, 
        is_on_sale, 
        sale_price, 
        badge_text
      FROM plans_catalog
      WHERE is_active IS NOT FALSE
      ORDER BY data_amount_gb ASC
    `;
  } catch (error) {
    console.error(error);
  }

  const valuePoints = [
    { icon: Wifi, title: "Instant Connectivity", text: "Get online the moment you land in Pakistan, no physical SIM queues." },
    { icon: Smartphone, title: "eSIM Only", text: "Works on factory-unlocked eSIM phones without touching your primary SIM." },
    { icon: ShieldCheck, title: "Data-Only Simplicity", text: "Designed for internet access, independent of local phone numbers." },
    { icon: MessageCircle, title: "24/7 Instagram Support", text: "Direct assistance from real experts if you have device questions." },
  ];

  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 pt-16 pb-12 text-center sm:px-6">
        <span className="inline-block rounded-full bg-teal-500/10 px-4 py-1 text-xs sm:text-sm font-bold text-teal-700 border border-teal-500/20">
          Simwaya for Pakistan 🇵🇰
        </span>
        <h1 className="mt-5 font-display text-3xl font-extrabold text-navy-950 sm:text-5xl tracking-tight leading-tight">
          Stay Connected in Pakistan — Without the Hassle of a Physical SIM
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-ink-600 leading-relaxed">
          Land in Karachi, Lahore, Islamabad or anywhere in Pakistan, scan your eSIM QR code, and get online in minutes.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/plans"
            className="inline-flex items-center justify-center rounded-full bg-navy-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 shadow-xs"
          >
            View Pakistan Plans
          </Link>
          <Link
            href="/devices"
            className="inline-flex items-center justify-center rounded-full border border-navy-900/15 bg-white px-6 py-3 text-sm font-semibold text-navy-950 transition hover:bg-mist-100 shadow-xs"
          >
            Check Device Compatibility
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h2 className="text-center font-display text-2xl font-bold text-navy-950">
          Why Travelers Choose Simwaya in Pakistan
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {valuePoints.map((point) => (
            <div key={point.title} className="rounded-2xl border border-navy-900/10 bg-white p-6 shadow-2xs">
              <point.icon className="text-teal-600" size={26} />
              <h3 className="mt-4 font-display text-base font-bold text-navy-950">{point.title}</h3>
              <p className="mt-2 text-xs sm:text-sm text-ink-600 leading-relaxed">{point.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="rounded-3xl bg-navy-950 p-8 text-white sm:p-10 shadow-xl">
          <h2 className="font-display text-2xl font-bold">Have a Non-PTA Phone?</h2>
          <p className="mt-4 text-xs sm:text-sm leading-relaxed text-white/80">
            Many non-PTA phones can use eSIM data roaming plans, since digital data connectivity is separate from local phone number registration. Device compatibility varies by model, so feel free to message our team on Instagram with your phone model to confirm before purchasing.
          </p>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-teal-500 px-5 py-3 text-xs sm:text-sm font-bold text-navy-950 transition hover:bg-teal-400"
          >
            Ask About My Device on Instagram
          </a>
        </div>
      </section>

      {plans.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy-950">Pakistan Plans</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-ink-600">
              High-speed 4G data packages for seamless connectivity across Pakistan.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h2 className="text-center font-display text-2xl font-bold text-navy-950">Frequently Asked Questions</h2>
        <div className="mt-8 space-y-3">
          <div className="rounded-xl border border-navy-900/10 bg-white p-5 shadow-2xs">
            <p className="font-bold text-navy-950">Will this work on my non-PTA phone?</p>
            <p className="mt-2 text-xs sm:text-sm text-ink-600 leading-relaxed">
              Yes, in most cases if your phone is factory-unlocked and has eSIM capability, you can use our digital travel data plans. Message us on Instagram with your exact model to be 100% sure!
            </p>
          </div>
          <div className="rounded-xl border border-navy-900/10 bg-white p-5 shadow-2xs">
            <p className="font-bold text-navy-950">Do I need a local Pakistani SIM?</p>
            <p className="mt-2 text-xs sm:text-sm text-ink-600 leading-relaxed">
              No, Simwaya gives you internet connectivity without needing to purchase or register a local plastic SIM.
            </p>
          </div>
          <div className="rounded-xl border border-navy-900/10 bg-white p-5 shadow-2xs">
            <p className="font-bold text-navy-950">Can I make WhatsApp calls?</p>
            <p className="mt-2 text-xs sm:text-sm text-ink-600 leading-relaxed">
              Yes! WhatsApp, FaceTime, Google Meet, and all social/browsing apps work smoothly over our high-speed data connection.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <Sparkles className="mx-auto text-teal-600" size={32} />
        <h2 className="mt-4 font-display text-2xl font-bold text-navy-950">Have More Questions?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink-600">
          Our team is available 24/7 on Instagram to answer device compatibility questions and deliver your eSIM.
        </p>
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-navy-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-navy-800 shadow-xs"
        >
          Chat on Instagram
        </a>
      </section>
    </div>
  );
}
