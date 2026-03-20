import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "syntxt_",
  description: "A minimalist, text-only microblogging platform for hackers and thinkers.",
  keywords: ["syntxt", "microblog", "text", "minimalist", "terminal"],
  authors: [{ name: "syntxt_" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "syntxt_",
    description: "A minimalist, text-only microblogging platform",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "syntxt_",
    description: "A minimalist, text-only microblogging platform",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-mono antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
