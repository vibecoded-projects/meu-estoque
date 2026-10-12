import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://stokfacil.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "StokFácil — Catálogo digital e vendas no WhatsApp",
    template: "%s | StokFácil",
  },
  description: "Seu estoque no bolso, suas vendas no WhatsApp",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "StokFácil",
    title: "StokFácil — Catálogo digital e vendas no WhatsApp",
    description: "Seu estoque no bolso, suas vendas no WhatsApp",
  },
  twitter: {
    card: "summary_large_image",
    title: "StokFácil — Catálogo digital e vendas no WhatsApp",
    description: "Seu estoque no bolso, suas vendas no WhatsApp",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
