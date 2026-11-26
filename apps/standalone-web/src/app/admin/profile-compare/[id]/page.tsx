import { ComparisonInspector } from "../_components/ComparisonInspector";

export default async function AdminComparisonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ComparisonInspector id={id} />;
}
