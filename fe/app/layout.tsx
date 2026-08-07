import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { AppRouteGuard } from "@/lib/auth/AppRouteGuard";
import "katex/dist/katex.min.css";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
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
      className={`${beVietnamPro.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider><AppRouteGuard>{children}</AppRouteGuard></AuthProvider>
      </body>
    </html>
  );
}
