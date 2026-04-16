import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import "./globals.css";
import "@stashgg/stash-pay/styles";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-work-sans",
});

export const metadata: Metadata = {
  title: "Stash Pay — Playground",
  description: "Interactive playground for the @stashgg/stash-pay SDK.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={workSans.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
