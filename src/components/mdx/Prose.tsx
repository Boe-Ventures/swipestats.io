export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="prose prose-gray lg:prose-lg max-w-none">{children}</div>
  );
}
