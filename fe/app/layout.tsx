import type { Metadata } from "next";
import { Be_Vietnam_Pro, Merriweather } from "next/font/google";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { AppRouteGuard } from "@/lib/auth/AppRouteGuard";
import "katex/dist/katex.min.css";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

// Serif tự host có đầy đủ bộ ký tự tiếng Việt; dùng cho lựa chọn Georgia trong editor.
const merriweather = Merriweather({
  variable: "--font-serif-vietnamese",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
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
      className={`${beVietnamPro.variable} ${merriweather.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider><AppRouteGuard>{children}</AppRouteGuard></AuthProvider>
      </body>
    </html>
  );
}
