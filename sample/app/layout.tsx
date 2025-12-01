import type { Metadata } from "next";
import "./globals.css";
import "@stashgg/stash-pay/styles";

export const metadata: Metadata = {
  title: "Next.js App",
  description: "A simple Next.js application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
