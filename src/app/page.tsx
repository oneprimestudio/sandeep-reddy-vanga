import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import JourneySection from "@/components/JourneySection";
import InfluenceSection from "@/components/InfluenceSection";
import FilmsSection from "@/components/FilmsSection";
import CraftSection from "@/components/CraftSection";
import Footer from "@/components/Footer";
import StorySection from "@/components/StorySection";
import FilmsSection2 from "@/components/FilmsSection2";
import Preloader from "@/components/Preloader";
import AwardsSection from "@/components/AwardsSection";
import PartnersSection from "@/components/Partnerssection";
import BhadrakaliStory from "@/components/BhadrakaliStory";
import PaperBurnSeam from "@/components/PaperBurnSeam";
import RememberSection from "@/components/Remembersection";
import BurnSeamSection from "@/components/Burnseamsection";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-white text-[#111116] selection:bg-[#d92626] selection:text-white">
      {/* Main Content Layer */}
      <div className="relative z-10 flex flex-col">
        <Navbar />
        <main>
          <HeroSection />
          <StorySection />
          <FilmsSection2 />
          <AwardsSection />
          <PartnersSection />
          <BurnSeamSection topColor="#111116" bottomColor="#ffffff" />
          <RememberSection />
        </main>
        <Footer />
      </div>
    </div>
  );
}
