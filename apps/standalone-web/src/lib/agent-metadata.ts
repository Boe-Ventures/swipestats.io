export const SWIPESTATS_ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "SwipeStats",
  legalName: "Boe Ventures AS",
  alternateName: "SwipeStats.io",
  url: "https://www.swipestats.io",
  logo: "https://www.swipestats.io/icon.png",
  description:
    "Dating app analytics platform. Upload your Tinder or Hinge data and get insights on match rates, swipe patterns, and percentile rankings from 12,000+ anonymous profiles.",
  foundingDate: "2019",
  contactPoint: {
    "@type": "ContactPoint",
    email: "kris@swipestats.io",
    contactType: "customer support",
    availableLanguage: ["English"],
  },
  address: {
    "@type": "PostalAddress",
    addressCountry: "NO",
  },
  sameAs: [
    "https://www.instagram.com/swipestats_io",
    "https://x.com/swipestats_io",
    "https://github.com/Boe-Ventures/swipestats.io",
  ],
} as const;
