import { Tabs, TabsContent, TabsList, TabsTrigger } from "swipestats";

export const SectionSwitcher = () => (
  <Tabs defaultValue="overview" className="w-full max-w-md">
    <TabsList>
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="usage">Daily usage</TabsTrigger>
      <TabsTrigger value="chats">Conversations</TabsTrigger>
    </TabsList>
    <TabsContent value="overview" className="pt-3 text-sm text-gray-600">
      Overview panel.
    </TabsContent>
    <TabsContent value="usage" className="pt-3 text-sm text-gray-600">
      Daily usage panel.
    </TabsContent>
    <TabsContent value="chats" className="pt-3 text-sm text-gray-600">
      Conversations panel.
    </TabsContent>
  </Tabs>
);

export const FullWidthList = () => (
  <Tabs defaultValue="usage" className="w-full max-w-md">
    <TabsList className="w-full">
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="usage">Daily usage</TabsTrigger>
      <TabsTrigger value="chats">Conversations</TabsTrigger>
    </TabsList>
    <TabsContent value="usage" className="pt-3 text-sm text-gray-600">
      Swipes, matches, and messages per day — the core usage chart lives here.
    </TabsContent>
  </Tabs>
);
