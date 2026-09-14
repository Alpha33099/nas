"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Sparkles, User } from "lucide-react";
import { siteConfig } from "@/config/site";
import { CurrencySelector } from "./CurrencySelector";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-navy-900/10 bg-mist-50/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight text-navy-950">
          {siteConfig.name}
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-ink-600 transition-colors hover:text-navy-950"
            >
              {item.flag ? `${item.flag} ${item.label}` : item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <CurrencySelector />

          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-full border border-navy-900/15 px-3.5 py-1.5 text-xs font-semibold text-navy-950 transition-colors hover:bg-navy-900/5 shadow-xs"
          >
            <User size={14} />
            Customer Login
          </Link>
          <Link
            href="/plans"
            className="rounded-full bg-navy-950 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy-800 shadow-xs"
          >
            Get eSIM
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <CurrencySelector />
          <button
            className="p-1 text-navy-950"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-navy-900/10 px-4 pb-4 lg:hidden">
          <nav className="flex flex-col gap-1 pt-2">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm text-ink-600 hover:bg-navy-900/5"
              >
                {item.flag ? `${item.flag} ${item.label}` : item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center gap-1.5 rounded-full border border-navy-900/20 px-4 py-2.5 text-center text-sm font-semibold text-navy-950 hover:bg-navy-900/5"
            >
              <User size={15} />
              Customer Login
            </Link>
            <Link
              href="/plans"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-full bg-navy-950 px-4 py-2.5 text-center text-sm font-semibold text-white"
            >
              Get eSIM
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
