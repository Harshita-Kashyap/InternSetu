import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InternSetu",
  description: "Your pathway to meaningful internship opportunities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}