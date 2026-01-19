/**
 * CTA injection position configuration
 * Defines where and what type of CTA to inject in blog posts
 */
export type CtaPosition = {
  headingIndex: number; // 0-based index: 1 = 2nd h2
  position: "before" | "after"; // Whether to inject before or after the heading
  ctaType: "inline" | "card" | "newsletter";
  props: Record<string, any>;
};

/**
 * Default CTA injection rules
 * These will be applied to all blog posts with enableAutoCtAs: true
 *
 * Strategy: Inject CTAs before every 2nd h2 (starting from the 2nd h2)
 * Pattern: CTA card first, then newsletter second, alternating
 * This creates natural conversion points throughout the content without being too intrusive
 */
export const CTA_INJECTION_RULES: CtaPosition[] = [
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
export function getCtaInjectionRules(
  category?: string,
  tags?: string[],
): CtaPosition[] {
  // Future: Add category-specific rules here
  // For now, return default rules for all posts
  return CTA_INJECTION_RULES;
}
