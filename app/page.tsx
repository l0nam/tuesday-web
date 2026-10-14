import { FaqSection } from "@/components/landing/faq-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HeroSection } from "@/components/landing/hero-section";
import { ReviewsSection } from "@/components/landing/reviews-section";
import { StatsCounters } from "@/components/landing/stats-counters";
import { WalletSection } from "@/components/landing/wallet-section";
import { WikiSocialsCta } from "@/components/landing/wiki-socials-cta";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <StatsCounters />
      <FeaturesSection />
      <WalletSection />
      <ReviewsSection />
      <FaqSection />
      <WikiSocialsCta />
    </main>
  );
}
