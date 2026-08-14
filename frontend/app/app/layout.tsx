import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import Providers from "@/providers/react-query";
import { ThemeProvider } from "next-themes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "NJ's Café & Restaurant",
    template: "%s | NJ's Café & Restaurant",
  },
  description:
    "Restaurant management system for NJ's Café & Restaurant — tables, orders, menu and analytics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            {children}
            <Toaster position="top-center" expand closeButton />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
