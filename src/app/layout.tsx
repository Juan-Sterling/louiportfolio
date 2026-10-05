import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://louiportfolio.my.canva.site"),
  title: "LOUI — Portfolio",
  description:
    "Official portfolio of LOUI based in Bandung, West Java, Indonesia. Showcasing Graphic Design, Photography, Videography, and Loui Tee collections.",
  openGraph: {
    title: "LOUI — Portfolio",
    description:
      "Based in Bandung, West Java, Indonesia. Explore Graphic Design, Photography, Videography, and Loui Tee.",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/images/loui-logo.png",
        width: 800,
        height: 800,
        alt: "LOUI Portfolio Logo",
      },
    ],
  },
  icons: {
    icon: "/images/loui-logo.png",
    apple: "/images/loui-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#edeced",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} font-sans`}>
      <body className="min-h-screen bg-[#edeced] text-[#141414] selection:bg-neutral-900 selection:text-[#edeced]">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
