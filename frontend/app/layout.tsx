import type { Metadata } from "next";
import "./globals.css";
import Splash from "./components/Splash";

export const metadata: Metadata = {
  title: "InternSetu",
  description: "Your pathway to meaningful internship opportunities",
  icons: { icon: "/logo-mark.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Splash />
        {children}
      </body>
    </html>
  );
}
