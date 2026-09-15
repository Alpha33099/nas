export const siteConfig = {
  name: "Simwaya",
  tagline: "Your Connection, Anywhere.",
  instagramUsername: "simvaya21",
  url: "https://simvaya.vercel.app",
  portalUrl: "",
  cryptoWallets: {
    trc20: process.env.NEXT_PUBLIC_CRYPTO_USDT_TRC20 || "TF17bgPaZYbq25b6a7C118z1gAxg5c6NTR",
    bep20: process.env.NEXT_PUBLIC_CRYPTO_USDT_BEP20 || "0x12a89F95F4D3C52367d3b2e75D65A2f5922378f5",
    polygon: process.env.NEXT_PUBLIC_CRYPTO_USDT_POLYGON || "0x12a89F95F4D3C52367d3b2e75D65A2f5922378f5",
  },
  nav: [
    { label: "Home", href: "/" },
    { label: "Plans", href: "/plans" },
    { label: "Pakistan", href: "/pakistan", flag: "🇵🇰" },
    { label: "Coverage", href: "/coverage" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Devices", href: "/devices" },
    { label: "FAQ", href: "/faq" },
  ],
};
