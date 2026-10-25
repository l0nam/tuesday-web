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
  metadataBase: new URL("https://tuesday-prime.ru"),

  title: {
    default: "Tuesday — Minecraft-сервер",
    template: "%s | Tuesday",
  },

  description:
    "Играй на Tuesday — Minecraft-сервере с кланами, экономикой и сообществом игроков. Создавай свою историю и развивайся вместе с другими.",

  applicationName: "Tuesday",
  category: "games",

  icons: {
    icon: "/images/logo.webp",
    shortcut: "/images/logo.webp",
  },

  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName: "Tuesday",
    title: "Tuesday — Minecraft-сервер",
    description:
      "Кланы, экономика и сообщество игроков. Заходи на Tuesday и начинай свою историю.",
  },

  twitter: {
    card: "summary",
    title: "Tuesday — Minecraft-сервер",
    description:
      "Кланы, экономика и сообщество игроков. Начни свою историю на Tuesday.",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
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
