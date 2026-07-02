import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "katex/dist/katex.min.css";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const libertine = localFont({
  variable: "--font-libertine",
  display: "swap",
  src: [
    {
      path: "./fonts/SVN-Linux Libertine regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/SVN-Linux Libertine Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/SVN-Linux Libertine bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/SVN-Linux Libertine bold italic.ttf",
      weight: "700",
      style: "italic",
    },
  ],
});

export const metadata: Metadata = {
  title: "EDUA",
  description: "AI assistant system for educators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${libertine.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
