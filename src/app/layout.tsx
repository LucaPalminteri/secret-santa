import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react"

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
  description: "A simple Secret Santa app built with Next.js",
  openGraph: {
    title: "Secret Santa",
    description: "A simple Secret Santa app built with Next.js",
    url: "https://secret-santa-blue-six.vercel.app",
    type: "website",
    images: [
      {
        url: "https://secret-santa-blue-six.vercel.app/santa.jpg",
        width: 1200,
        height: 630,
        alt: "Secret Santa app preview image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Secret Santa",
    description: "A simple Secret Santa app built with Next.js",
    images: ["https://secret-santa-blue-six.vercel.app/santa.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}<Analytics /></body>
    </html>
  );
}
