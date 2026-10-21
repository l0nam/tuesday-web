import { ConnectedWalletSection } from "@/components/connected";
import { FaqSection } from "@/components/landing/faq-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HeroSection } from "@/components/landing/hero-section";
import { ReviewsSection } from "@/components/landing/reviews-section";
import { StatsCounters } from "@/components/landing/stats-counters";
import { WikiSocialsCta } from "@/components/landing/wiki-socials-cta";
import { getPublicReviews } from "@/lib/reviews";

export default async function Home() {
  const reviews = await getPublicReviews();

  return (
    <main>
      <HeroSection />
      <StatsCounters />
      <FeaturesSection />
      <ConnectedWalletSection />
      <ReviewsSection reviews={reviews} />
      <FaqSection />
      <WikiSocialsCta />
    </main>
  );
}
