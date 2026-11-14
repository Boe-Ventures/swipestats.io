"use client";

import { Text } from "@/app/_components/ui/text";
import Typewriter from "typewriter-effect";

export function HeroHeading() {
  return (
    <Text.MarketingH1>
      <span>Visualize your</span>
      <br />
      <span className="inline-block min-h-[40px]">
        <Typewriter
          options={{
            strings: ["Tinder", "Hinge", "Bumble"],
            autoStart: true,
            loop: true,
          }}
        />
      </span>
      <br />
      <span>data</span>
    </Text.MarketingH1>
  );
}
