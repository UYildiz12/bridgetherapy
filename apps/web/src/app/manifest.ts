import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Exhale",
    short_name: "Exhale",
    description:
      "A calmer, clearer space for therapy: track mood, capture reflections, and stay connected with your therapist.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0b0c10",
    theme_color: "#0b0c10",
    categories: ["health", "medical", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
