import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import recipes from "./recipes-data.json";
import "./globals.css";

const count = recipes.length;
const plural = (n: number, forms: [string, string, string]) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return forms[1];
  return forms[2];
};
const title = `Majin kuvar — ${count} ${plural(count, ["porodični recept", "porodična recepta", "porodičnih recepata"])}`;
const description = `Porodična zbirka od ${count} ${plural(count, ["pažljivo prepisanog recepta", "pažljivo prepisana recepta", "pažljivo prepisanih recepata"])} — od torti i peciva do tradicionalnih slanih jela.`;

export const viewport: Viewport = {
  themeColor: "#39432f",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title,
    description,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
      shortcut: "/favicon.svg",
      apple: "/icons/apple-touch-icon.png",
    },
    appleWebApp: { capable: true, title: "Majin kuvar", statusBarStyle: "default" },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "sr_RS",
      images: [{ url: imageUrl, width: 1730, height: 909, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sr">
      <body>{children}</body>
    </html>
  );
}
