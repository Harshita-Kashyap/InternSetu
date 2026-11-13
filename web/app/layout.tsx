import type { Metadata, Viewport } from "next";

import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource/noto-sans-devanagari/400.css";
import "@fontsource/noto-sans-devanagari/500.css";
import "@fontsource/noto-sans-devanagari/700.css";

import "@fontsource/noto-sans-bengali/400.css";
import "@fontsource/noto-sans-bengali/500.css";
import "@fontsource/noto-sans-bengali/700.css";

import "./globals.css";
import RegisterSW from "./components/RegisterSW";



export const metadata: Metadata = {
  title: "InternSetu",
  description: "Your pathway to meaningful internship opportunities",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo-mark.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#256b73",
};

const themeInit = `
try {
  var t = localStorage.getItem("internsetu_theme");
  if (!t) {
    t = matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  document.documentElement.dataset.theme = t;
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>

      <body>{children}<RegisterSW /></body>
    </html>
  );
}