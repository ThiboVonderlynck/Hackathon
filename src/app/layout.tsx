import type { Metadata } from "next";
import { Providers } from "./providers";
import "../index.css";

export const metadata: Metadata = {
  title: "NERD.HUB - Connect with Your Building Squad",
  description: "Break the ice with fellow students through wacky challenges and games. Join your building's team, compete in daily challenges, and climb the leaderboard!",
  keywords: ["student app", "social networking", "campus", "building challenge", "gamification", "howest"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#0a0c10" />
        <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
