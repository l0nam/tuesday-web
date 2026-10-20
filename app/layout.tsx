import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/footer";
import { ConnectedNavbar } from "@/components/connected";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const hirro = localFont({
  src: [
    {
      path: "../public/fonts/hirro_sans_bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/hirro_sans_medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/hirro_sans_regular.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-hirro",
  display: "swap",
});

const pixel = localFont({
  src: [
    {
      path: "../public/fonts/minecraft.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tuesday",
  description: "Tuesday",
  icons: {
    icon: "/images/logo.webp",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased font-sans",
        inter.variable,
        hirro.variable,
        pixel.variable,
      )}
    >
      <body className="min-h-full flex flex-col dark">
        <ConnectedNavbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
