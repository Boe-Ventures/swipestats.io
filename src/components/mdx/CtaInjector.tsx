"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CTA } from "./CTA";
import { CtaCard } from "./CtaCard";
import { NewsletterCard } from "./NewsletterCard";

/**
 * CTA injection position configuration
 */
type CtaPosition = {
  headingIndex: number; // 0-based index: 1 = 2nd h2
  position: "before" | "after"; // Whether to inject before or after the heading
  ctaType: "inline" | "card" | "newsletter";
  props: Record<string, unknown>;
};

/**
 * Default CTA injection rules
 * These will be applied to all blog posts with enableAutoCtAs: true
 *
 * Strategy: Inject CTAs before every 2nd h2 (starting from the 2nd h2)
 * Pattern: CTA card first, then newsletter second, alternating
 * This creates natural conversion points throughout the content without being too intrusive
 */
const CTA_INJECTION_RULES: CtaPosition[] = [
  {
    headingIndex: 1, // 2nd h2
    position: "before",
    ctaType: "card",
    props: {
      title: "Unlock Your Complete Dating Profile Analysis",
      description:
        "Upload your Tinder, Hinge, or Bumble data to get personalized insights, compare yourself to demographics worldwide, and discover what's working (or not working) in your dating life.",
      buttonText: "Get Started - It's Free",
      buttonHref: "/upload?provider=tinder",
    },
  },
  {
    headingIndex: 3, // 4th h2
    position: "before",
    ctaType: "newsletter",
    props: {
      // NewsletterCard uses default props
    },
  },
  {
    headingIndex: 5, // 6th h2
    position: "before",
    ctaType: "card",
    props: {
      title: "Unlock Your Complete Dating Profile Analysis",
      description:
        "Upload your Tinder, Hinge, or Bumble data to get personalized insights, compare yourself to demographics worldwide, and discover what's working (or not working) in your dating life.",
      buttonText: "Get Started - It's Free",
      buttonHref: "/upload?provider=tinder",
    },
  },
  {
    headingIndex: 7, // 8th h2
    position: "before",
    ctaType: "newsletter",
    props: {
      // NewsletterCard uses default props
    },
  },
  {
    headingIndex: 9, // 10th h2
    position: "before",
    ctaType: "card",
    props: {
      title: "Unlock Your Complete Dating Profile Analysis",
      description:
        "Upload your Tinder, Hinge, or Bumble data to get personalized insights, compare yourself to demographics worldwide, and discover what's working (or not working) in your dating life.",
      buttonText: "Get Started - It's Free",
      buttonHref: "/upload?provider=tinder",
    },
  },
];

/**
 * Get CTA injection rules
 * Can be extended in the future to support per-category or per-post rules
 */
function getCtaInjectionRules(
  _category?: string,
  _tags?: string[],
): CtaPosition[] {
  // Future: Add category-specific rules here
  // For now, return default rules for all posts
  return CTA_INJECTION_RULES;
}

interface CtaInjectorProps {
  category?: string;
  tags?: string[];
}

/**
 * CtaInjector - Automatically injects CTA components into blog posts
 *
 * This component scans the DOM for h2 headings and injects CTA components
 * at strategic positions based on the configured injection rules.
 *
 * Uses React portals to render CTAs into dynamically created DOM nodes.
 */
export function CtaInjector({ category, tags }: CtaInjectorProps) {
  const [injectionPoints, setInjectionPoints] = useState<
    Array<{ element: HTMLElement; config: CtaPosition }>
  >([]);

  useEffect(() => {
    // Wait a tick for MDX to render
    const timer = setTimeout(() => {
      const proseContainer = document.querySelector(".prose");
      if (!proseContainer) {
        console.warn("CtaInjector: Could not find .prose container");
        return;
      }

      const headings = Array.from(proseContainer.querySelectorAll("h2"));
      const rules = getCtaInjectionRules(category, tags);

      const points: Array<{ element: HTMLElement; config: CtaPosition }> = [];

      rules.forEach((rule) => {
        const targetHeading = headings[rule.headingIndex];
        if (!targetHeading) {
          // Heading doesn't exist (article too short)
          return;
        }

        // Create a wrapper div for the CTA
        const ctaContainer = document.createElement("div");
        ctaContainer.className = "cta-injection-point not-prose";
        ctaContainer.setAttribute("data-cta-type", rule.ctaType);
        ctaContainer.setAttribute("data-position", rule.position);

        // Insert before or after the heading based on configuration
        if (rule.position === "before") {
          // Insert before the heading
          targetHeading.parentNode?.insertBefore(ctaContainer, targetHeading);
        } else {
          // Insert after the heading
          // We need to find the next sibling or the parent's next sibling
          // to ensure we're inserting between sections
          const nextElement = targetHeading.nextElementSibling;
          if (nextElement) {
            targetHeading.parentNode?.insertBefore(ctaContainer, nextElement);
          } else {
            targetHeading.parentNode?.appendChild(ctaContainer);
          }
        }

        points.push({ element: ctaContainer, config: rule });
      });

      setInjectionPoints(points);
    }, 100);

    return () => {
      clearTimeout(timer);
      // Cleanup: remove injected containers
      document
        .querySelectorAll(".cta-injection-point")
        .forEach((el) => el.remove());
    };
  }, [category, tags]);

  // Render CTAs into their injection points using portals
  return (
    <>
      {injectionPoints.map((point, index) => {
        const Component = getCtaComponent(point.config.ctaType);
        return createPortal(
          // @ts-expect-error - this is ok
          <Component key={index} {...point.config.props} />,
          point.element,
        );
      })}
    </>
  );
}

/**
 * Get the appropriate CTA component based on type
 */
function getCtaComponent(type: CtaPosition["ctaType"]) {
  switch (type) {
    case "inline":
      return CTA;
    case "card":
      return CtaCard;
    case "newsletter":
      return NewsletterCard;
    default:
      return CTA;
  }
}
