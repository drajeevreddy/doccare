import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://doccare-delta.vercel.app";

  return [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/appointments`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/patients`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/consultation`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/prescriptions`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/billing`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/laboratory`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/analytics`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/pharmacy`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/settings`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/portal`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/kiosk`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
