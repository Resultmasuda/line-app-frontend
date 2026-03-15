import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "業務管理アプリ",
  description: "LIFF 勤怠・シフト・交通費統合システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="bg-gray-100 text-gray-900 antialiased font-sans min-h-screen overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
