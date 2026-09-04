import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ghost Terminal",
  description: "An endless, never-repeating simulation of a machine hard at work.",
};

export const viewport: Viewport = {
  themeColor: "#05070b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
