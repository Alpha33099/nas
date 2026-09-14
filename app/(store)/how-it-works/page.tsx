import Link from "next/link";
import { ArrowRight, QrCode, Smartphone, Send, ShieldCheck, CheckCircle2 } from "lucide-react";

const steps = [
  {
    num: "01",
    title: "Choose Your Destination",
    desc: "Browse our country coverage catalog or select our global travel bundles.",
    icon: GlobeIcon,
  },
  {
    num: "02",
    title: "Select Data Quota",
    desc: "Pick from 1GB, 3GB, 5GB, 10GB, 20GB, or 50GB bundles tailored to your travel duration.",
    icon: Smartphone,
  },
  {
    num: "03",
    title: "Order via Instagram",
    desc: "Message our team on Instagram (@simvaya21) to confirm your payment with zero hassle.",
    icon: Send,
  },
  {
    num: "04",
    title: "Receive Instant QR Code",
    desc: "Your digital eSIM QR code is delivered straight to your chat or customer portal.",
    icon: QrCode,
  },
  {
    num: "05",
    title: "Scan & Install in 60s",
    desc: "Open Settings > Cellular / Mobile Service > Add eSIM, then scan your QR code.",
    icon: CheckCircle2,
  },
  {
    num: "06",
    title: "Turn On Roaming & Enjoy",
    desc: "Enable data roaming when you land. Your high-speed connection activates automatically!",
    icon: ShieldCheck,
  },
];

function GlobeIcon(props: any) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
    </svg>
  );
}

export default function HowItWorksPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="text-center sm:text-left">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-950 sm:text-4xl">
          How It Works
        </h1>
        <p className="mt-3 max-w-xl text-sm sm:text-base text-ink-600">
          Getting connected with Simwaya is 100% digital — no plastic SIM cards, no queues, no roaming shock.
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="relative rounded-2xl border border-navy-900/10 bg-white p-6 shadow-2xs hover:border-teal-500/40 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-teal-600 tracking-wider">
                  STEP {step.num}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <Icon size={16} />
                </div>
              </div>
              <h3 className="mt-3 text-lg font-bold text-navy-950">{step.title}</h3>
              <p className="mt-1 text-sm text-ink-600 leading-relaxed">{step.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-12 rounded-3xl bg-navy-950 p-8 text-center text-white shadow-xl">
        <h2 className="text-2xl font-bold">Ready to travel connected?</h2>
        <p className="mt-2 text-sm text-mist-200/80">Explore our flexible data packages and get your QR code today.</p>
        <Link
          href="/plans"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-teal-500 px-6 py-3 text-sm font-bold text-navy-950 hover:bg-teal-400 transition shadow-xs"
        >
          View Plans & Pricing <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}
