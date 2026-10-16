import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { startOpsSync } from "@/lib/store";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "UBON Six Seven" },
      {
        name: "description",
        content: "แพลตฟอร์มประสานความช่วยเหลือน้ำท่วมจังหวัดอุบลราชธานี",
      },
      { name: "theme-color", content: "#122033" },
      { property: "og:title", content: "UBON Six Seven" },
      { property: "og:description", content: "แพลตฟอร์มประสานความช่วยเหลือน้ำท่วมจังหวัดอุบลราชธานี" },
      { property: "og:image", content: "/og.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-180.png" },
    ],
  }),
  component: Root,
});

function Root() {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <Boot />
        <Toaster position="top-center" />
        <Scripts />
      </body>
    </html>
  );
}

function Boot() {
  useEffect(() => startOpsSync(), []);
  return <Outlet />;
}
