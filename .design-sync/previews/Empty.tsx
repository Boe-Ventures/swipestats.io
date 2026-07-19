import {
  Button,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "swipestats";

export const NoProfilesYet = () => (
  <div className="w-full">
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No profiles yet</EmptyTitle>
        <EmptyDescription>
          Upload your export to see your insights here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  </div>
);

export const WithIconAndAction = () => (
  <div className="w-full">
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 16V4m0 0-4 4m4-4 4 4" />
            <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </svg>
        </EmptyMedia>
        <EmptyTitle>No exports uploaded</EmptyTitle>
        <EmptyDescription>
          Your Tinder or Hinge data file stays in your browser — identifiers
          are stripped before anything is analyzed.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm">Upload your export</Button>
      </EmptyContent>
    </Empty>
  </div>
);

export const WithHelpLink = () => (
  <div className="w-full">
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No matches in this period</EmptyTitle>
        <EmptyDescription>
          Try widening the date range, or{" "}
          <a href="/blog/how-to-request-your-data">
            learn how to request a fresh export
          </a>
          .
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  </div>
);
