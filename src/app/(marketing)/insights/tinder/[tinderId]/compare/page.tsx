import { ComparisonProvider } from "../ComparisonProvider";
import { CompareInsightsPageContent } from "./_components/CompareInsightsPageContent";

export default async function CompareInsightsPage({
  params,
}: {
  params: Promise<{ tinderId: string }>;
}) {
  const { tinderId: _tinderId } = await params;

  return (
    <ComparisonProvider>
      <CompareInsightsPageContent />
    </ComparisonProvider>
  );
}
