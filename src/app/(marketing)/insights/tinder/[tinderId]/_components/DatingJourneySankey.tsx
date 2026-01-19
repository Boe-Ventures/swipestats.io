"use client";

import {
  Sankey,
  Tooltip,
  Rectangle,
  Layer,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import { useTinderProfile } from "../TinderProfileProvider";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";

// Chart configuration following shadcn/ui patterns
const chartConfig = {
  swipes: {
    label: "Total Swipes",
    color: "hsl(25, 95%, 53%)", // Orange (Flame)
  },
  likes: {
    label: "Right Swipes",
    color: "hsl(330, 81%, 60%)", // Pink (Heart)
  },
  matches: {
    label: "Matches",
    color: "hsl(271, 81%, 60%)", // Purple (Users)
  },
  messaged: {
    label: "Messaged",
    color: "hsl(189, 71%, 56%)", // Cyan (Messages)
  },
  goodConvo: {
    label: "Good Conversations",
    color: "hsl(142, 71%, 45%)", // Green
  },
  movedApp: {
    label: "Moved to Other App",
    color: "hsl(200, 80%, 50%)", // Blue
  },
  phone: {
    label: "Phone Numbers",
    color: "hsl(217, 91%, 60%)", // Deep Blue
  },
  dateArranged: {
    label: "Dates Arranged",
    color: "hsl(262, 83%, 58%)", // Purple
  },
  dateAttended: {
    label: "Dates Attended",
    color: "hsl(152, 69%, 31%)", // Dark Green
  },
  dateNoShow: {
    label: "No Shows",
    color: "hsl(0, 84%, 60%)", // Red
  },
  dateCreepy: {
    label: "Creepy Dates",
    color: "hsl(15, 80%, 45%)", // Dark Orange
  },
  dateNoSpark: {
    label: "No Spark",
    color: "hsl(45, 60%, 50%)", // Yellow
  },
  onlyOneDate: {
    label: "Only One Date",
    color: "hsl(280, 60%, 55%)", // Light Purple
  },
  multipleDates: {
    label: "Multiple Dates",
    color: "hsl(160, 70%, 40%)", // Teal
  },
  relationships: {
    label: "Relationships",
    color: "hsl(340, 82%, 52%)", // Hot Pink
  },
} satisfies ChartConfig;

// Custom node component styled with Tailwind
const CustomNode = (props: any) => {
  const { x, y, width, height, index, payload, containerWidth } = props;

  const isOut = x + width + 6 > containerWidth;
  const textAnchor = isOut ? "end" : "start";
  const textX = isOut ? x - 6 : x + width + 6;

  return (
    <g key={`CustomNode${index}`}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload.color || "#8884d8"}
        fillOpacity="1"
      />
      <text
        textAnchor={textAnchor}
        x={textX}
        y={y + height / 2}
        fontSize="14"
        fill="currentColor"
        fontWeight="500"
      >
        {payload.name}
      </text>
      <text
        textAnchor={textAnchor}
        x={textX}
        y={y + height / 2 + 16}
        fontSize="12"
        fill="#666"
      >
        {payload.value?.toLocaleString()}
      </text>
    </g>
  );
};

// Custom tooltip following shadcn/ui patterns
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-background rounded-lg border p-3 shadow-lg">
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {data.source?.name || data.target?.name}
        </p>
        <p className="text-muted-foreground text-xs">
          {data.value?.toLocaleString()} people
        </p>
      </div>
    </div>
  );
};

export function DatingJourneySankey() {
  const { meta, tinderId, readonly } = useTinderProfile();
  const trpc = useTRPC();

  // Fetch custom outcomes data (only when authenticated, not in readonly mode)
  const customDataQuery = useQuery(
    trpc.customData.get.queryOptions(
      { tinderProfileId: tinderId },
      { refetchOnWindowFocus: false, enabled: !readonly },
    ),
  );

  if (!meta) return null;

  const globalMeta = meta;

  const customData = customDataQuery.data;

  // Check if we have any custom data fields with values
  const hasCustomData =
    customData &&
    Object.keys(customData)
      .filter(
        (k) =>
          k !== "tinderProfileId" &&
          k !== "userId" &&
          k !== "id" &&
          k !== "createdAt" &&
          k !== "updatedAt",
      )
      .some((key) => {
        const value = customData[key as keyof typeof customData];
        return typeof value === "number" && value > 0;
      });

  // Calculate combined swipes total
  const combinedSwipesTotal =
    (globalMeta.swipeLikesTotal ?? 0) + (globalMeta.swipePassesTotal ?? 0);

  // Build nodes with actual values for display
  const nodes = [
    {
      name: "Total Swipes",
      color: chartConfig.swipes.color,
      value: combinedSwipesTotal,
    },
    {
      name: "Right Swipes",
      color: chartConfig.likes.color,
      value: globalMeta.swipeLikesTotal,
    },
    {
      name: "Matches",
      color: chartConfig.matches.color,
      value: globalMeta.matchesTotal,
    },
  ];

  // Build links starting with the core funnel
  const links = [
    {
      source: 0, // Total Swipes
      target: 1, // Right Swipes
      value: Math.max(globalMeta.swipeLikesTotal || 0, 1),
    },
    {
      source: 1, // Right Swipes
      target: 2, // Matches
      value: Math.max(globalMeta.matchesTotal || 0, 1),
    },
  ];

  // Add custom data nodes/links if available
  if (hasCustomData && customData) {
    let nodeIndex = 3;

    // Messaged
    if (customData.messaged && customData.messaged > 0) {
      nodes.push({
        name: "Messaged",
        color: chartConfig.messaged.color,
        value: customData.messaged,
      });
      links.push({ source: 2, target: nodeIndex, value: customData.messaged });

      const messagedIndex = nodeIndex;
      nodeIndex++;

      // Good Conversations branch
      if (customData.goodConversation && customData.goodConversation > 0) {
        nodes.push({
          name: "Good Conversations",
          color: chartConfig.goodConvo.color,
          value: customData.goodConversation,
        });
        links.push({
          source: messagedIndex,
          target: nodeIndex,
          value: customData.goodConversation,
        });

        const goodConvoIndex = nodeIndex;
        nodeIndex++;

        // Moved to different app
        if (
          customData.movedToADifferentApp &&
          customData.movedToADifferentApp > 0
        ) {
          nodes.push({
            name: "Moved to Other App",
            color: chartConfig.movedApp.color,
            value: customData.movedToADifferentApp,
          });
          links.push({
            source: goodConvoIndex,
            target: nodeIndex,
            value: customData.movedToADifferentApp,
          });
          nodeIndex++;
        }

        // Phone numbers
        if (
          customData.phoneNumbersExchanged &&
          customData.phoneNumbersExchanged > 0
        ) {
          nodes.push({
            name: "Phone Numbers",
            color: chartConfig.phone.color,
            value: customData.phoneNumbersExchanged,
          });
          links.push({
            source: goodConvoIndex,
            target: nodeIndex,
            value: customData.phoneNumbersExchanged,
          });

          const phoneIndex = nodeIndex;
          nodeIndex++;

          // Dates arranged
          if (customData.dateArranged && customData.dateArranged > 0) {
            nodes.push({
              name: "Dates Arranged",
              color: chartConfig.dateArranged.color,
              value: customData.dateArranged,
            });
            links.push({
              source: phoneIndex,
              target: nodeIndex,
              value: customData.dateArranged,
            });

            const arrangedIndex = nodeIndex;
            nodeIndex++;

            // Date outcomes - these branch out
            if (customData.dateAttended && customData.dateAttended > 0) {
              nodes.push({
                name: "Dates Attended",
                color: chartConfig.dateAttended.color,
                value: customData.dateAttended,
              });
              links.push({
                source: arrangedIndex,
                target: nodeIndex,
                value: customData.dateAttended,
              });

              const attendedIndex = nodeIndex;
              nodeIndex++;

              // Final outcomes from attended dates
              if (customData.multipleDates && customData.multipleDates > 0) {
                nodes.push({
                  name: "Multiple Dates",
                  color: chartConfig.multipleDates.color,
                  value: customData.multipleDates,
                });
                links.push({
                  source: attendedIndex,
                  target: nodeIndex,
                  value: customData.multipleDates,
                });

                const multipleDatesIndex = nodeIndex;
                nodeIndex++;

                // Relationships
                if (
                  customData.relationshipsStarted &&
                  customData.relationshipsStarted > 0
                ) {
                  nodes.push({
                    name: "Relationships",
                    color: chartConfig.relationships.color,
                    value: customData.relationshipsStarted,
                  });
                  links.push({
                    source: multipleDatesIndex,
                    target: nodeIndex,
                    value: customData.relationshipsStarted,
                  });
                  nodeIndex++;
                }
              }

              // One date only
              if (customData.onlyOneDate && customData.onlyOneDate > 0) {
                nodes.push({
                  name: "Only One Date",
                  color: chartConfig.onlyOneDate.color,
                  value: customData.onlyOneDate,
                });
                links.push({
                  source: attendedIndex,
                  target: nodeIndex,
                  value: customData.onlyOneDate,
                });
                nodeIndex++;
              }

              // Negative outcomes
              if (customData.dateNoSpark && customData.dateNoSpark > 0) {
                nodes.push({
                  name: "No Spark",
                  color: chartConfig.dateNoSpark.color,
                  value: customData.dateNoSpark,
                });
                links.push({
                  source: attendedIndex,
                  target: nodeIndex,
                  value: customData.dateNoSpark,
                });
                nodeIndex++;
              }
            }

            // No shows
            if (customData.dateNoShow && customData.dateNoShow > 0) {
              nodes.push({
                name: "No Shows",
                color: chartConfig.dateNoShow.color,
                value: customData.dateNoShow,
              });
              links.push({
                source: arrangedIndex,
                target: nodeIndex,
                value: customData.dateNoShow,
              });
              nodeIndex++;
            }

            // Creepy dates
            if (customData.dateCreepy && customData.dateCreepy > 0) {
              nodes.push({
                name: "Creepy Dates",
                color: chartConfig.dateCreepy.color,
                value: customData.dateCreepy,
              });
              links.push({
                source: arrangedIndex,
                target: nodeIndex,
                value: customData.dateCreepy,
              });
              nodeIndex++;
            }
          }
        }
      }
    }
  }

  const data = { nodes, links };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Complete Dating Journey</CardTitle>
        <CardDescription>
          {hasCustomData
            ? "From swipes to relationships - your complete funnel"
            : "Add your outcomes to see the complete journey"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[600px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={data}
              nodePadding={50}
              nodeWidth={20}
              linkCurvature={0.5}
              iterations={32}
              margin={{ top: 20, right: 180, bottom: 20, left: 180 }}
              node={<CustomNode />}
              link={{ stroke: "#77777777" }}
            >
              <Tooltip content={<CustomTooltip />} />
            </Sankey>
          </ResponsiveContainer>
        </div>
        {!hasCustomData && (
          <div className="bg-muted/50 mt-6 rounded-lg border border-dashed p-4">
            <p className="text-muted-foreground text-center text-sm">
              💡 Add your real-world outcomes below to see the complete journey
              beyond matches
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
