import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "INKVERSE — อ่านมังงะออนไลน์ฟรี",
    short_name: "INKVERSE",
    description: "ศูนย์รวมมังงะ มังฮวา แปลไทยครบทุกแนว อ่านฟรีไม่มีโฆษณา",
    start_url: "/",
    display: "standalone",
    background_color: "#080a10",
    theme_color: "#080a10",
    lang: "th",
    categories: ["entertainment", "books"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
