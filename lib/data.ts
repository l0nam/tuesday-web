import { Icon } from "@phosphor-icons/react";
import {
  BookOpenIcon,
  DiscordLogoIcon,
  HeartIcon,
  TiktokLogoIcon,
  YoutubeLogoIcon,
} from "@phosphor-icons/react/dist/ssr";

type SocialLink = {
  name: string;
  link: string;
  icon: Icon;
  colors: string;
};

export const SERVER_IP = "tuesday-prime.ru";
export const LINKS: Record<string, SocialLink> = {
  discord: {
    name: "Дискорд",
    link: "https://discord.gg/Fzj6DV83Gw",
    icon: DiscordLogoIcon,
    colors: "bg-indigo-500 hover:bg-indigo-600",
  },
  youtube: {
    name: "YouTube",
    link: "https://www.youtube.com/@TuesdayMC4",
    icon: YoutubeLogoIcon,
    colors: "bg-red-600 hover:bg-red-500",
  },
  tiktok: {
    name: "TikTok",
    link: "https://www.tiktok.com/@tuesdaymc?_r=1&_t=ZN-996AXOLJj9y",
    icon: TiktokLogoIcon,
    colors: "bg-zinc-900 hover:bg-neutral-900",
  },
  donate: {
    name: "Поддержать проект",
    link: "https://donate.tuesday-prime.ru/",
    icon: HeartIcon,
    colors: "bg-orange-400 hover:bg-amber-500",
  },
  wiki: {
    name: "Вики",
    link: "https://wiki.tuesday-prime.ru/",
    icon: BookOpenIcon,
    colors:
      "bg-[#64748B] dark:bg-[#94A3B8] hover:bg-[#475569] dark:hover:bg-[#CBD5E1]",
  },
};
