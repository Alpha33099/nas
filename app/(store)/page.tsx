import Link from "next/link";
import { Smartphone, Globe2, HeadphonesIcon, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { AskAIButton } from "@/components/AskAIButton";
import { sql } from "@/lib/db";
import { PlanCard } from "@/components/PlanCard";

export const revalidate = 60; // ISR cache revalidated every minute or on admin update

export default async function Home() {
  let featuredPlans: any[] = [];
  try {
    featuredPlans = await sql`
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
      ORDER BY is_highlighted DESC, data_amount_gb ASC
      LIMIT 3
    `;
  } catch (error) {
    console.warn("Could not load featured plans:", error);
  }

  return (
    <>
      {/* Hero */}
      <section className="border-b border-navy-900/10 bg-mist-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-50 px-3.5 py-1 text-xs font-semibold text-teal-700">
            <Sparkles size={13} className="text-teal-600" />
            <span>Pakistan &middot; International Travel &middot; Digital eSIM</span>
          </div>
          <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-navy-950 sm:text-5xl">
            Stay connected anywhere in the world.
          </h1>
          <p className="mt-4 max-w-xl text-base sm:text-lg leading-relaxed text-ink-600">
            Flexible eSIM mobile connectivity for Pakistan and global destinations.
            No physical SIM swapping. Instant QR code delivery.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/plans"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-navy-950 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-navy-800 shadow-xs"
            >
              Explore All Plans <ArrowRight size={15} />
            </Link>
            <AskAIButton className="flex items-center justify-center gap-2 rounded-full border border-teal-500/30 bg-white px-6 py-3 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50/50 shadow-xs">
              Ask Simwaya AI
            </AskAIButton>
          </div>
        </div>
      </section>

      {/* Featured Plans Section (Dynamic from Database) */}
      {featuredPlans.length > 0 && (
        <section className="border-b border-navy-900/10 bg-white py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-teal-600">
                  Popular Travel Bundles
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-navy-950 mt-1">
                  Ready to Activate Today
                </h2>
              </div>
              <Link
                href="/plans"
                className="text-xs sm:text-sm font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
              >
                View all plans →
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredPlans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pakistan / Non-PTA highlight */}
      <section className="border-b border-navy-900/10 bg-mist-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-3xl bg-navy-950 px-6 py-10 sm:px-12 sm:py-14 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Built for Pakistan &middot; Ready for the World
              </p>
              <h2 className="mt-3 max-w-xl text-2xl font-bold text-white sm:text-3xl leading-snug">
                Traveling to Pakistan or using a compatible non-PTA device? Simwaya keeps you connected with high-speed 4G data.
              </h2>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/devices"
                  className="rounded-full bg-teal-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-navy-950 transition-colors hover:bg-teal-400"
                >
                  Check Device Compatibility
                </Link>
                <Link
                  href="/pakistan"
                  className="rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Learn More 🇵🇰
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value proposition */}
      <section className="bg-white py-16 border-b border-navy-900/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <ValueCard
              icon={<Globe2 size={20} />}
              title="Global Connectivity"
              description="Stay connected seamlessly across all supported travel destinations."
            />
            <ValueCard
              icon={<Smartphone size={20} />}
              title="Pakistan Ready"
              description="Plans and guides tailored specifically for Pakistani travelers."
            />
            <ValueCard
              icon={<ShieldCheck size={20} />}
              title="Digital Activation"
              description="Receive your QR code instantly. No physical SIM or store visit required."
            />
            <ValueCard
              icon={<HeadphonesIcon size={20} />}
              title="24/7 Human Support"
              description="Fast assistance on Instagram from real experts anytime you travel."
            />
          </div>
        </div>
      </section>
    </>
  );
}

function ValueCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-navy-900/10 bg-mist-50 p-6 transition hover:border-navy-900/20">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-bold text-navy-950">{title}</h3>
      <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-ink-600">{description}</p>
    </div>
  );
}
