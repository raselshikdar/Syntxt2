import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL('https://syntxt.app'),
  title: {
    default: "syntxt_ - Minimalist Text-Only Microblogging",
    template: "%s | syntxt_",
  },
  description: "A minimalist, text-only microblogging platform for hackers, developers, and thinkers. Share your thoughts in pure text without the noise. Terminal-inspired design for those who appreciate simplicity.",
  keywords: [
    "syntxt",
    "microblog",
    "text-only",
    "minimalist",
    "terminal",
    "hackers",
    "developers",
    "social media",
    "twitter alternative",
    "plaintext",
    "coding",
    "tech",
  ],
  authors: [{ name: "syntxt_", url: "https://syntxt.app" }],
  creator: "syntxt_",
  publisher: "syntxt_",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://syntxt.app',
    siteName: 'syntxt_',
    title: 'syntxt_ - Minimalist Text-Only Microblogging',
    description: 'A minimalist, text-only microblogging platform for hackers, developers, and thinkers. Share your thoughts in pure text.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'syntxt_ - Text-Only Microblogging',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'syntxt_ - Minimalist Text-Only Microblogging',
    description: 'A minimalist, text-only microblogging platform for hackers, developers, and thinkers.',
    images: ['/og-image.png'],
    creator: '@syntxt_',
  },
  alternates: {
    canonical: 'https://syntxt.app',
  },
  category: 'technology',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
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
