import type { Metadata, Viewport } from "next";
import { SITE_NAME, SITE_URL, THEME_COLOR, siteDescription, siteTitle } from "@/lib/site";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: siteTitle,
  description: siteDescription,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    locale: "sr_RS",
    url: "/",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: siteTitle }],
  },
  twitter: { card: "summary_large_image", title: siteTitle, description: siteDescription, images: ["/og.jpg"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sr">
      <body>{children}</body>
    </html>
  );
}
