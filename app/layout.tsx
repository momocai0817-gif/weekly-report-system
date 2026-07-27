import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "论文指导周报系统",
  description: "学生周报提交系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
