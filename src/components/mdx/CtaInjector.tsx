"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CTA } from "./CTA";
import { CtaCard } from "./CtaCard";
import { NewsletterCard } from "./NewsletterCard";
import {
  getCtaInjectionRules,
  type CtaPosition,
} from "@/lib/cta-injection-config";

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
