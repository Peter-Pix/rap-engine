import type { MetadataRoute } from "next";

const BASE_URL = "https://4rap.cz";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // API a interní cesty — neindexovat
        disallow: ["/api/", "/_next/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
