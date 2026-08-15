import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import localFont from "next/font/local";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { AppRouteGuard } from "@/lib/auth/AppRouteGuard";
import "katex/dist/katex.min.css";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const linuxLibertine = localFont({
  variable: "--font-libertine",
  display: "swap",
  src: [
    { path: "./fonts/SVN-Linux Libertine regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/SVN-Linux Libertine bold.ttf", weight: "700", style: "normal" },
    { path: "./fonts/SVN-Linux Libertine Italic.ttf", weight: "400", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: "EDUA — Trợ lý AI cho giáo viên Khoa học tự nhiên",
  description:
    "Tạo giáo án theo Công văn 5512, slide bài giảng, mô phỏng khoa học, đề kiểm tra và quản lý lớp học trong một quy trình liền mạch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${linuxLibertine.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider><AppRouteGuard>{children}</AppRouteGuard></AuthProvider>
      </body>
    </html>
  );
}
