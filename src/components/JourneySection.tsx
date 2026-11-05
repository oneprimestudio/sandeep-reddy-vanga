"use client";

import Text from "./Text";

const JOURNEY_STEPS = [
  {
    title: "The Beginning",
    description:
      "Every filmmaker has a beginning. He began in Warangal, Telangana, where a young boy grew up surrounded by stories, cinema and an imagination that would eventually find its own language.",
  },
  {
    title: "A Different Destination",
    description:
      "Like many Indian families, his first expected destination was medicine. He didn't secure the marks for MBBS, so he chose physiotherapy. But life had a different direction waiting for him.",
  },
  {
    title: "The Leap of faith",
    description:
      "He left the familiar path behind and travelled to Sydney to study filmmaking. A new environment, different cultures and countless films opened his eyes to the possibilities of cinema.",
  },
];

export default function JourneySection() {
  return (
    <section
      id="about"
      className="relative py-16 md:py-24 px-4 md:px-8 border-b border-black/10"
    >
      <div className="mx-auto max-w-[1720px]">
        {/* Mobile section heading */}
        <div className="md:hidden mb-10 pb-4 border-b border-black/10">
          <p className="vanga-label font-medium text-ink-muted">
            From medicine to movie direction
          </p>
        </div>

        {/* Desktop 12-column Grid Layout matching Figma */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-y-12 md:gap-x-8">
          {/* Left Column (Sticky Label) */}
          <div className="hidden md:block md:col-span-3">
            <p className="vanga-label font-normal text-ink-muted sticky top-28">
              From medicine to movie direction
            </p>
          </div>

          {/* Right Content Area (Columns 4 to 12): 3 distinct rows */}
          <div className="md:col-span-9 flex flex-col divide-y divide-black/10">
            {JOURNEY_STEPS.map((step, idx) => (
              <div
                key={step.title}
                className={`grid grid-cols-1 md:grid-cols-9 gap-4 md:gap-8 ${
                  idx === 0 ? "pb-10 md:pb-14" : "py-10 md:py-14"
                }`}
              >
                {/* Step Title (Middle Column in Figma: e.g. The Beginning) */}
                <div className="md:col-span-4">
                  <h3 className="vanga-label font-medium text-ink md:text-[17px]">
                    {step.title}
                  </h3>
                </div>

                {/* Step Narrative (Right Column in Figma) */}
                <div className="md:col-span-5">
                  <Text variant="slideUp" scrollStart="top 90%">
                    <p className="vanga-label font-normal text-ink leading-[1.65] md:leading-[1.7] max-w-[50ch]">
                      {step.description}
                    </p>
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
