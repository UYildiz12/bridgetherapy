import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import "./landing.css"; // We will create this
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { IosInstallHint } from "@/components/pwa/ios-install-hint";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Exhale - Therapy designed for steady focus",
  description: "Exhale keeps support focused and steady: quiet sessions, clear structure, and calm guidance built for your nervous system.",
  applicationName: "Exhale",
  appleWebApp: {
    capable: true,
    title: "Exhale",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0c10",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${instrumentSans.variable} ${instrumentSerif.variable} antialiased`}
      >
        {children}
        <ServiceWorkerRegister />
        <IosInstallHint />
      </body>
    </html>
  );
}
