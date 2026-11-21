import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import {
  OfflineIndicator,
  ServiceWorkerRegister,
} from "@/components/PWAControls";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "AudioSync Studio — Offline Video to Audio Converter",
  description:
    "Fast offline video-to-audio converter. Extract MP3 or WAV audio locally in seconds and save directly to your device without internet.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AudioSync",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "AudioSync Studio — Offline Video to Audio Converter",
    description:
      "Fast offline video-to-audio converter. Extract MP3 or WAV audio locally in seconds and save directly to your device without internet.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen text-slate-900 font-sans antialiased selection:bg-indigo-200 selection:text-indigo-950">
        <ServiceWorkerRegister />
        {children}
        <OfflineIndicator />
        <Analytics />
      </body>
    </html>
  );
}
