import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SimwayaAI } from "@/components/SimwayaAI";
import { CurrencyProvider } from "@/components/CurrencyContext";
import { headers } from "next/headers";
import { getCountryFromHeaders, getCurrencyForCountry } from "@/lib/currency";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const reqHeaders = await headers();
  const country = getCountryFromHeaders(reqHeaders);
  const currency = getCurrencyForCountry(country);

  return (
    <CurrencyProvider initialCurrency={currency} initialCountry={country}>
      <div className="min-h-screen flex flex-col bg-mist-50 text-ink-900">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <SimwayaAI />
      </div>
    </CurrencyProvider>
  );
}
