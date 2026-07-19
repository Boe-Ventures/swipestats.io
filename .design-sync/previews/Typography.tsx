import {
  TypographyBlockquote,
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyInlineCode,
  TypographyLead,
  TypographyList,
  TypographyMuted,
  TypographyP,
} from "swipestats";

export const Headings = () => (
  <div className="max-w-xl">
    <TypographyH1>Your dating data, decoded</TypographyH1>
    <TypographyH2 className="mt-6">What the data actually says</TypographyH2>
    <TypographyH3 className="mt-4">By the numbers</TypographyH3>
  </div>
);

export const BodyCopy = () => (
  <div className="max-w-xl">
    <TypographyLead>
      Across 7,000+ profiles, the median match rate tells a clear story.
    </TypographyLead>
    <TypographyP>
      Women match roughly six times more often than men, and response time is
      the strongest predictor of conversation length. Upload your export and
      see where you land — identifiers are stripped in your browser via{" "}
      <TypographyInlineCode>anonymize()</TypographyInlineCode> before anything
      is uploaded.
    </TypographyP>
    <TypographyMuted>
      Based on anonymized Tinder and Hinge exports.
    </TypographyMuted>
  </div>
);

export const ListsAndQuotes = () => (
  <div className="max-w-xl">
    <TypographyList
      items={[
        { text: "Real behavior, not self-reports" },
        { text: "Women match ~6× more often than men" },
        { text: "Response time predicts conversation length" },
      ]}
    />
    <TypographyBlockquote>
      &ldquo;I finally understood why my match rate dropped every
      December.&rdquo;
    </TypographyBlockquote>
  </div>
);
