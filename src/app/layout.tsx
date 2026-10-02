import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { SITE } from "@/config/site";
import { appUrl } from "@/config/env";
import "@/styles/globals.css";

const plex = IBM_Plex_Sans({
  subsets: ["latin", "cyrillic"],
  weight: "variable",
  variable: "--font-plex",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(appUrl()),
    title: { default: SITE.title, template: "%s | MobiTed" },
    description: SITE.description,
    applicationName: SITE.name,
    openGraph: {
      type: "website",
      locale: SITE.locale,
      siteName: SITE.name,
      title: SITE.title,
      description: SITE.description,
    },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bg" className={plex.variable}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
