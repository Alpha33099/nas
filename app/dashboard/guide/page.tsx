import Link from "next/link";

export default function QuickGuidePage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <Link href="/dashboard" className="text-xs font-semibold text-teal-600 hover:text-teal-700 mb-2 inline-block">
          ← Back to Active Plans
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          eSIM Quick Setup & Installation Guide
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Step-by-step instructions to get connected on iOS and Android smartphones
        </p>
      </div>

      {/* Two Column Setup Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Apple iPhone Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold text-base">
                
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Apple iPhone (iOS)</h2>
                <p className="text-2xs text-slate-400">iOS 12.1+ compatible models</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-slate-600 list-decimal list-inside leading-relaxed">
              <li className="p-3 bg-slate-50 rounded-xl">
                Open <strong className="text-slate-800">Settings → Cellular / Mobile Service</strong>.
              </li>
              <li className="p-3 bg-slate-50 rounded-xl">
                Tap <strong className="text-slate-800">Add eSIM</strong> or <strong className="text-slate-800">Set Up Cellular</strong>.
              </li>
              <li className="p-3 bg-slate-50 rounded-xl">
                Scan your QR code or select <strong className="text-slate-800">Use QR Code → Enter Details Manually</strong>.
              </li>
              <li className="p-3 bg-slate-50 rounded-xl">
                Set this eSIM for <strong className="text-slate-800">Cellular Data</strong> only.
              </li>
              <li className="p-3 bg-teal-50 text-teal-800 border border-teal-200/60 rounded-xl font-medium">
                IMPORTANT: Turn <strong className="font-bold">Data Roaming ON</strong> for this eSIM once you land at your destination.
              </li>
            </ol>
          </div>
        </div>

        {/* Android Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-base">
                <svg className="w-5 h-5 text-emerald-700" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5802 8.4114 13.8443 8.082 12 8.082c-1.8443 0-3.5802.3294-5.1368.8677L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396"/>
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Android (Samsung / Google Pixel)</h2>
                <p className="text-2xs text-slate-400">eSIM-supported models</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-slate-600 list-decimal list-inside leading-relaxed">
              <li className="p-3 bg-slate-50 rounded-xl">
                Open <strong className="text-slate-800">Settings → Connections / Network & Internet</strong>.
              </li>
              <li className="p-3 bg-slate-50 rounded-xl">
                Tap <strong className="text-slate-800">SIM Manager</strong> or <strong className="text-slate-800">SIMs</strong>.
              </li>
              <li className="p-3 bg-slate-50 rounded-xl">
                Tap <strong className="text-slate-800">Add eSIM / Add Mobile Plan</strong>.
              </li>
              <li className="p-3 bg-slate-50 rounded-xl">
                Scan your QR code or paste your activation code.
              </li>
              <li className="p-3 bg-teal-50 text-teal-800 border border-teal-200/60 rounded-xl font-medium">
                IMPORTANT: Turn <strong className="font-bold">Roaming ON</strong> for this SIM when you reach your travel destination.
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* APN Settings Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">APN & Internet Settings</h3>
        <p className="text-xs text-slate-500 mb-4">
          Most phones configure the APN automatically. If your data doesn&apos;t connect upon landing, verify these settings:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium block">APN Name</span>
            <span className="font-mono font-bold text-slate-800 mt-0.5 block">globaldata</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium block">Username / Password</span>
            <span className="font-mono font-bold text-slate-800 mt-0.5 block">[Leave Empty]</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium block">Data Roaming</span>
            <span className="font-bold text-emerald-600 mt-0.5 block">Must be Enabled</span>
          </div>
        </div>
      </div>

      {/* Need Help Banner */}
      <div className="rounded-2xl bg-slate-900 text-white p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h4 className="font-bold text-sm">Need Setup Assistance?</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Send us a screenshot or message on Instagram and our team will guide you in 2 minutes.
          </p>
        </div>
        <a
          href="https://ig.me/m/simvaya21"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors shrink-0"
        >
          Chat on Instagram ↗
        </a>
      </div>
    </div>
  );
}
