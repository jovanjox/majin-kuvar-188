import type { Metadata, Viewport } from "next";
import ServiceWorker from "@/components/ServiceWorker";
import { SITE_NAME, SITE_URL, THEME_COLOR, siteDescription, siteTitle } from "@/lib/site";
import "./globals.css";

// Boja trake pregledača u tamnoj temi — pozadina iz tamne palete u globals.css.
const THEME_COLOR_DARK = "#221f18";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR_DARK },
  ],
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
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
