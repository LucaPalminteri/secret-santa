import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

const nunitoSans = localFont({
  src: "./fonts/NunitoSansLatin.woff2",
  variable: "--font-nunito-sans",
  weight: "400 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Secret Santa",
  description:
    "Organize a Secret Santa gift exchange effortlessly with this app.",
  keywords: [
    "Secret Santa",
    "Gift Exchange",
    "Holiday App",
    "Next.js Project",
    "Organize Gift Swaps",
  ],
  authors: [
    {
      name: "Luca Palminteri",
      url: "https://github.com/LucaPalminteri",
    },
  ],
  // themeColor: "#FF0000",
  openGraph: {
    title: "Secret Santa",
    description:
      "Organize a Secret Santa gift exchange effortlessly with this app.",
    url: "https://secret-santa-blue-six.vercel.app",
    type: "website",
    siteName: "Secret Santa App",
    locale: "en_US",
    images: [
      {
        url: "https://secret-santa-blue-six.vercel.app/santa.jpg",
        width: 1200,
        height: 630,
        alt: "Secret Santa app preview image",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Secret Santa",
    description:
      "Organize a Secret Santa gift exchange effortlessly with this app.",
    images: ["https://secret-santa-blue-six.vercel.app/santa.jpg"],
  },
  // viewport: "width=device-width, initial-scale=1.0",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${nunitoSans.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
