import DataRequestSupport from "../DataRequestSupport";
import NewsletterCTA from "../NewsletterCTA";

export default function HowToRequestYourDataPage() {
  return (
    <div className="isolate">
      <DataRequestSupport />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <NewsletterCTA />
      </div>
    </div>
  );
}
