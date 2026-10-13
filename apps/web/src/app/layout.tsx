import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/lib/wallet";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif", weight: ["300", "400", "500"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Niskala — Private RFQ",
  description: "Private quotes. Provably best execution. A sealed RFQ market on Monad with ZK-verified winner selection.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${serif.variable}`}>
      <body className="min-h-screen flex flex-col">
        <WalletProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
