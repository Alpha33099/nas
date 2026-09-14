"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { faqs } from "@/data/faqs";

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          <HelpCircle size={13} className="text-teal-600" />
          <span>Support & Help</span>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-navy-950 sm:text-4xl">
          Frequently Asked Questions
        </h1>
        <p className="mt-2 text-sm sm:text-base text-ink-600">
          Answers to common questions about Simwaya eSIM plans, compatibility, activation, and usage.
        </p>
      </div>

      <div className="mt-8 divide-y divide-navy-900/10 rounded-2xl border border-navy-900/10 bg-white shadow-xs overflow-hidden">
        {faqs.map((faq, i) => (
          <div key={faq.question} className="transition hover:bg-mist-50/50">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="flex w-full items-center justify-between px-6 py-4 text-left cursor-pointer"
              type="button"
            >
              <span className="text-sm font-semibold text-navy-950">{faq.question}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-ink-400 transition-transform duration-200 ${
                  openIndex === i ? "rotate-180 text-teal-600" : ""
                }`}
              />
            </button>
            {openIndex === i && (
              <div className="px-6 pb-4 pt-1 text-sm leading-relaxed text-ink-600 border-t border-navy-900/5 bg-mist-50/30">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
