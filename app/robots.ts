import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/login", "/booking"],
      },
    ],
    sitemap: "https://rainbowsurfretreats.com/sitemap.xml",
  };
}
