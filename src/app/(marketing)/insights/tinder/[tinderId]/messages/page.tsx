import { MessagesProvider } from "./MessagesProvider";
import { MessagesPageContent } from "./_components/MessagesPageContent";

export default function MessagesPage() {
  return (
    <MessagesProvider>
      <MessagesPageContent />
    </MessagesProvider>
  );
}
