import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider, themeAntiFlashScript } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "StyleDeck",
  description: "Private fashion discovery for the select few.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeAntiFlashScript }} />
      </head>
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
