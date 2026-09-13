import Link from "next/link";

export default function TermsAndConditionsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <Link href="/dashboard" className="text-xs font-semibold text-teal-600 hover:text-teal-700 mb-2 inline-block">
          ← Back to Active Plans
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Terms & Conditions</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Last Updated: September 2026 · Simvaya International eSIM Services
        </p>
      </div>

      {/* Terms Body */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 text-xs text-slate-600 leading-relaxed shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-1.5">1. Service Scope & Activation</h2>
          <p>
            Simvaya provides prepaid international eSIM data bundles for travelers worldwide. The validity period of any purchased plan commences immediately upon the first connection to a supported foreign cellular network or upon manual activation, whichever occurs first. Once the validity duration (in days) expires or the allocated data allowance (in GB) is reached, data connectivity terminates automatically.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-1.5">2. Device Compatibility & Network Lock</h2>
          <p>
            It is the customer&apos;s sole responsibility to verify that their mobile device is factory-unlocked and supports eSIM functionality prior to purchasing. Simvaya is not liable for service failures resulting from carrier-locked handsets, outdated operating systems, or unsupported hardware models.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-1.5">3. Data Usage & Fair Use Policy</h2>
          <p>
            All plans include high-speed 4G LTE or 5G data allowances as described in the catalog. Personal hotspot and tethering are fully permitted. However, activities that violate local laws or carrier guidelines (such as automated mass scraping, illegal torrenting, or commercial resale) are strictly prohibited and may result in immediate suspension by regional partner networks.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-1.5">4. International Coverage & Speeds</h2>
          <p>
            Simvaya partners with Tier-1 telecommunication operators in over 140 countries. Connection speed and latency depend on the local infrastructure, regional antenna distance, and network congestion of the destination carrier. 5G access is available subject to local network availability and handset capability.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-1.5">5. Refunds & Cancellation Policy</h2>
          <p>
            Because digital eSIM profiles and data packages are generated and provisioned instantly, refunds cannot be issued once a package has been activated, partially consumed, or installed on a handset. If you experience an unresolvable technical outage attributable to our service, contact support within 24 hours of arrival for troubleshooting or replacement credit.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-1.5">6. Customer Support & Contact</h2>
          <p>
            For assistance with APN configuration, data refills, or coverage verification, contact our official support concierge 24/7 on Instagram:{" "}
            <a
              href="https://ig.me/m/simvaya21"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-teal-600 hover:underline"
            >
              @simvaya21
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}
