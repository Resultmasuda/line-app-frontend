import type { Metadata } from "next";
import "./globals.css";
import LiffProvider from "@/components/LiffProvider";

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
      <body className="bg-gray-100 text-gray-900 antialiased font-sans flex justify-center min-h-screen">
        {/* モバイルアプリUIのような制約枠（PCで見てもスマホ風になるように） */}
        <div className="w-full max-w-md bg-white min-h-screen relative shadow-2xl overflow-hidden">
          <LiffProvider>
            {children}
          </LiffProvider>
        </div>
      </body>
    </html>
  );
}
