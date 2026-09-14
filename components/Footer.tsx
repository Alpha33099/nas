import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t border-navy-900/10 bg-navy-950 text-mist-100">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <p className="font-display text-lg font-semibold text-white">
              {siteConfig.name}
            </p>
            <p className="mt-2 text-sm text-mist-200/70">{siteConfig.tagline}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-white">Explore</p>
            <ul className="mt-3 space-y-2 text-sm text-mist-200/70">
              <li><Link href="/plans" className="hover:text-white">Plans</Link></li>
              <li><Link href="/pakistan" className="hover:text-white">Pakistan</Link></li>
              <li><Link href="/coverage" className="hover:text-white">Coverage</Link></li>
              <li><Link href="/devices" className="hover:text-white">Devices</Link></li>
              <li><Link href="/how-it-works" className="hover:text-white">How It Works</Link></li>
              <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium text-white">Support</p>
            <ul className="mt-3 space-y-2 text-sm text-mist-200/70">
              <li>
                <a href={`https://instagram.com/${siteConfig.instagramUsername}`} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  Instagram
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-white font-medium text-teal-300">
                  Customer Login →
                </Link>
              </li>
              <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
              <li><Link href="/refund-policy" className="hover:text-white">Refund Policy</Link></li>
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 text-xs text-mist-200/50">
          &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
