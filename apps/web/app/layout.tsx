import type { Metadata } from "next";
import { Dancing_Script, Kanit } from "next/font/google";

import "./globals.css";

const kanit = Kanit({
  subsets: ["latin", "thai"],
  variable: "--font-kanit",
  weight: ["300", "400", "500", "600", "700"],
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-dancing-script",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Artsband Platform",
  description: "Artsband is the full-stack rehearsal, scheduling, and song voting platform for the Faculty of Arts music club.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${kanit.variable} ${dancingScript.variable}`}>
        {children}
      </body>
    </html>
  );
}
