"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export default function CustomerNav({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { href: "/dashboard", label: "My Plans" },
    { href: "/dashboard/plans", label: "Browse Plans" },
    { href: "/dashboard/guide", label: "Setup Guide" },
    { href: "/dashboard/history", label: "History" },
  ];

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/customer/logout", { method: "POST" });
      router.push("/login");
    } catch {
      setLoggingOut(false);
    }
  }

  const initial = (username ? username.charAt(0) : "U").toUpperCase();

  return (
    <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Desktop Nav Links */}
          <div className="flex items-center gap-6 sm:gap-8">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-white font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
                S
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight">
                Simvaya
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1.5">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? "bg-teal-500/10 text-teal-700 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Side: Avatar & 3-Bars Menu */}
          <div className="flex items-center gap-3">
            {/* User Avatar Badge */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white text-xs font-semibold flex items-center justify-center shadow-xs">
                {initial}
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-700 hidden sm:inline">
                @{username}
              </span>
            </div>

            {/* 3-Bars Menu Button */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors flex items-center justify-center"
                aria-label="Navigation menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Dropdown Menu pointing to real routes */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-bold text-slate-900">Simvaya Account</p>
                    <p className="text-2xs text-slate-400">@{username}</p>
                  </div>

                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-2 text-xs transition-colors font-medium ${
                      pathname === "/dashboard" ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>Home (My Plans)</span>
                  </Link>

                  <Link
                    href="/dashboard/plans"
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-2 text-xs transition-colors font-medium ${
                      pathname === "/dashboard/plans" ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span>Browse Plans</span>
                  </Link>

                  <Link
                    href="/dashboard/guide"
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-2 text-xs transition-colors font-medium ${
                      pathname === "/dashboard/guide" ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>Quick Guide Setup</span>
                  </Link>

                  <Link
                    href="/dashboard/history"
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-2 text-xs transition-colors font-medium ${
                      pathname === "/dashboard/history" ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>View History</span>
                  </Link>

                  <div className="my-1 border-t border-slate-100"></div>

                  <a
                    href="https://ig.me/m/simvaya21"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                  >
                    <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>Help & Support</span>
                  </a>

                  <Link
                    href="/dashboard/terms"
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-2 text-xs transition-colors font-medium ${
                      pathname === "/dashboard/terms" ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Terms & Conditions</span>
                  </Link>

                  <div className="my-1 border-t border-slate-100"></div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors font-semibold text-left disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}