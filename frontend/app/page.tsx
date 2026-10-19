import { Hero } from "@/components/home/Hero";
import { Intro } from "@/components/home/Intro";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Intelligence } from "@/components/home/Intelligence";
import { ComputingEngine } from "@/components/home/ComputingEngine";
import { FinalCta } from "@/components/home/FinalCta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Intro />
      <HowItWorks />
      <Intelligence />
      <ComputingEngine />
      <FinalCta />
    </>
  );
}
