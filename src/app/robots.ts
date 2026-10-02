import type { MetadataRoute } from "next";
import { appUrl } from "@/config/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/profil", "/admin", "/api/", "/publikuvai", "/suobshteniya", "/demo-plashtane", "/dev/", "/vhod", "/registratsiya", "/lyubimi"],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
