import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
  applicationName: BRAND.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: BRAND.shortName,
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="starfield" aria-hidden />
        <ServiceWorkerRegister />
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-[calc(4.25rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
