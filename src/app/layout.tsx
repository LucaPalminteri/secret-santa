import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Secret Santa",
  description: "Organize a Secret Santa gift exchange effortlessly with this app.",
  keywords: ["Secret Santa", "Gift Exchange", "Holiday App", "Next.js Project", "Organize Gift Swaps"],
  authors: [
    {
      name: "Luca Palminteri",
      url: "https://github.com/LucaPalminteri",
    },
  ],
  themeColor: "#FF0000",
  openGraph: {
    title: "Secret Santa",
    description: "Organize a Secret Santa gift exchange effortlessly with this app.",
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
    description: "Organize a Secret Santa gift exchange effortlessly with this app.",
    images: ["https://secret-santa-blue-six.vercel.app/santa.jpg"],
  },
  viewport: "width=device-width, initial-scale=1.0",
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
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
