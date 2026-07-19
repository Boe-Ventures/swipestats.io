import { Banner } from "swipestats";

export const ExportReady = () => (
  <div className="w-full">
    <Banner
      title="Your Hinge export is ready"
      message="We parsed 1,204 conversations and 312 matches."
      ctaText="View insights"
      ctaHref="/insights"
    />
  </div>
);

export const WithBadgeAndDismiss = () => (
  <div className="w-full">
    <Banner
      badge="New"
      title="Compare mode"
      message="Benchmark your match rate against 7,000+ anonymous profiles."
      ctaText="Try it"
      ctaHref="/compare"
      showDismiss
      onDismiss={() => undefined}
    />
  </div>
);

export const ResearchAnnouncement = () => (
  <div className="w-full">
    <Banner
      title="SwipeStats research"
      message="Women match roughly 6× more often than men — see what the data says."
      ctaText="Read the report"
      ctaHref="/research"
    />
  </div>
);
