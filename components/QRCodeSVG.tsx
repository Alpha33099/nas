"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRCodeSVGProps {
  value: string;
  size?: number;
  className?: string;
}

export default function QRCodeSVG({ value, size = 180, className = "" }: QRCodeSVGProps) {
  const [svgString, setSvgString] = useState<string>("");

  useEffect(() => {
    if (!value) return;

    QRCode.toString(value, {
      type: "svg",
      margin: 1,
      color: {
        dark: "#0a192f",
        light: "#ffffff",
      },
      width: size,
    })
      .then((svg) => setSvgString(svg))
      .catch((err) => console.error("QR Code generation error:", err));
  }, [value, size]);

  if (!svgString) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-slate-100 rounded-xl text-xs text-slate-400 animate-pulse ${className}`}
      >
        Generating QR...
      </div>
    );
  }

  return (
    <div
      className={`inline-block rounded-xl overflow-hidden shadow-xs bg-white p-2 border border-slate-200 ${className}`}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
}
