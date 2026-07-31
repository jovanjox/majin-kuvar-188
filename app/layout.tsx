import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "Majin kuvar — 188 porodičnih recepata";
const description = "Porodična zbirka od 188 pažljivo prepisanih recepata — od torti i peciva do tradicionalnih slanih jela.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title,
    description,
    icons: { icon: "/recipes/001.webp", shortcut: "/recipes/001.webp" },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "sr_RS",
      images: [{ url: imageUrl, width: 1730, height: 909, alt: "Majin kuvar — 188 porodičnih recepata" }],
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
