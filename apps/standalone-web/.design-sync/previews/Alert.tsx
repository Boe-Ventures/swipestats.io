import {
  Alert,
  AlertDescription,
  AlertTitle,
  ErrorAlert,
  InfoAlert,
  NeutralAlert,
  PrimaryAlert,
  SuccessAlert,
  SwipestatsAlert,
  WarningAlert,
} from "swipestats";

export const SemanticHelpers = () => (
  <div className="flex w-full flex-col gap-3">
    <InfoAlert>Your export is processing.</InfoAlert>
    <SuccessAlert>Insights are ready to view.</SuccessAlert>
    <WarningAlert>Bumble can take up to 30 days.</WarningAlert>
    <ErrorAlert>Couldn&apos;t parse the uploaded file.</ErrorAlert>
  </div>
);

export const PrimaryAndNeutral = () => (
  <div className="flex w-full flex-col gap-3">
    <PrimaryAlert>
      Premium unlocks cohort comparison across 7,000+ profiles.
    </PrimaryAlert>
    <NeutralAlert>
      Identifiers are stripped in your browser before anything is uploaded.
    </NeutralAlert>
  </div>
);

export const Composed = () => (
  <div className="flex w-full flex-col gap-3">
    <Alert>
      <AlertTitle>Upload received</AlertTitle>
      <AlertDescription>
        Your Tinder export is queued for parsing. This usually takes under a
        minute.
      </AlertDescription>
    </Alert>
    <Alert variant="destructive">
      <AlertTitle>Unsupported file</AlertTitle>
      <AlertDescription>
        We expected a data.json from your Tinder export. Re-request your data
        and try again.
      </AlertDescription>
    </Alert>
  </div>
);

export const LegacySwipestats = () => (
  <div className="flex w-full flex-col gap-3">
    <SwipestatsAlert
      category="success"
      title="Profile anonymized"
      description="Your insights are live. Nothing personally identifiable left your browser."
    />
    <SwipestatsAlert
      category="warning"
      title="Export incomplete"
      descriptionList={[
        "Messages are missing from this file",
        "Bumble can take up to 30 days to deliver exports",
      ]}
    />
  </div>
);
