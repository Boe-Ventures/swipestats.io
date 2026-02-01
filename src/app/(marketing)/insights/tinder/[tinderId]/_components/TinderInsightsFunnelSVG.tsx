import {
  calculateStageWidth,
  createTransitionPath,
  calculateBubbleDimensions,
} from "./funnel-path-utils";
import { getFunnelColors, type FunnelVariant } from "./funnel-colors";

interface StageData {
  id: string;
  value: number;
  label: string;
  labelPosition: "left" | "right" | "below" | "above";
  x: number; // X position in SVG coordinates
  y: number; // Y position in SVG coordinates
  showPath: boolean; // Whether to show connecting path to previous stage
  prevStageX?: number; // X position of previous stage
  prevStageHalfWidth?: number; // Half-width of previous stage for path calculation
  isDropout?: boolean; // Dropout stages have lower opacity
  dropoutSide?: "left" | "right"; // Which side the dropout text appears
}

interface GlobalMeta {
  combinedSwipesTotal: number;
  swipePassesTotal: number;
  swipeLikesTotal: number;
  matchesTotal: number;
  noMatchesTotal: number;
  conversationsWithMessages: number;
}

interface CustomData {
  dateAttended: number | null;
  sleptWithEventually: number | null;
  relationshipsStarted: number | null;
}

interface TinderInsightsFunnelSVGProps {
  globalMeta: GlobalMeta;
  customData: CustomData | undefined;
  hasCustomData: boolean;
  variant: FunnelVariant;
  theme: "light" | "dark";
}

export function TinderInsightsFunnelSVG({
  globalMeta,
  customData,
  hasCustomData,
  variant,
  theme,
}: TinderInsightsFunnelSVGProps) {
  // Get theme-appropriate colors with variant
  const colors = getFunnelColors(theme, variant);

  // SVG coordinate system
  const viewBoxWidth = 1000;
  const centerX = viewBoxWidth / 2;
  const stageSpacing = 256; // Vertical spacing between stages
  const maxWidth = 320; // Maximum width for widest stage
  const combinedSwipesTotal =
    (globalMeta.swipeLikesTotal ?? 0) + (globalMeta.swipePassesTotal ?? 0);
  const noMatchesTotal =
    (globalMeta.swipeLikesTotal ?? 0) - (globalMeta.matchesTotal ?? 0);
  const maxValue = combinedSwipesTotal || 1; // Avoid division by zero

  // Calculate viewBox dimensions based on content
  // For shareable variant: include space for title (225) and footer (1970)
  // For neutral variant: tighter bounds around actual content
  const getViewBoxParams = () => {
    if (variant === "shareable") {
      return { startY: 0, height: 2000 };
    }
    // For neutral variant, crop top and bottom whitespace
    const startY = 220; // Start just above first bubble at Y=300
    if (hasCustomData) {
      // Last row at Y=1580, plus bubble (56) + label (40) + padding (80)
      return { startY, height: 1756 - startY };
    }
    // Without custom data, last row at Y=1068
    return { startY, height: 1244 - startY };
  };
  const { startY: viewBoxStartY, height: viewBoxHeight } = getViewBoxParams();

  // Calculate widths for all stages
  const totalSwipesWidth = calculateStageWidth(
    combinedSwipesTotal,
    maxValue,
    maxWidth,
  );
  const _leftSwipesWidth = calculateStageWidth(
    globalMeta.swipePassesTotal ?? 0,
    maxValue,
    maxWidth,
  );
  const rightSwipesWidth = calculateStageWidth(
    globalMeta.swipeLikesTotal ?? 0,
    maxValue,
    maxWidth,
  );
  const matchesWidth = calculateStageWidth(
    globalMeta.matchesTotal ?? 0,
    maxValue,
    maxWidth,
  );
  const _noMatchWidth = calculateStageWidth(noMatchesTotal, maxValue, maxWidth);
  const chatsWidth = calculateStageWidth(
    globalMeta.conversationsWithMessages ?? 0,
    maxValue,
    maxWidth,
  );
  const noChats =
    (globalMeta.matchesTotal ?? 0) -
    (globalMeta.conversationsWithMessages ?? 0);
  const _noChatsWidth = calculateStageWidth(
    noChats > 0 ? noChats : 0,
    maxValue,
    maxWidth,
  );

  // Build stage data array
  const stages: StageData[] = [];

  // Row 0 (Y=300): Total Swipes (just the title bubble)
  const totalSwipesX = centerX;
  const totalSwipesY = 300;
  stages.push({
    id: "total-swipes",
    value: combinedSwipesTotal,
    label: "You swiped",
    labelPosition: "above",
    x: totalSwipesX,
    y: totalSwipesY,
    showPath: false,
  });

  // Row 1 (Y=556): Left Swipes (dropout) and Right Swipes
  const leftSwipesX = 300;
  const rightSwipesX = 700;
  const row1Y = 556;

  stages.push({
    id: "left-swipes",
    value: globalMeta.swipePassesTotal ?? 0,
    label: "left swipes",
    labelPosition: "left",
    x: leftSwipesX,
    y: row1Y,
    showPath: true,
    prevStageX: totalSwipesX,
    prevStageHalfWidth: totalSwipesWidth / 2,
    isDropout: true,
    dropoutSide: "left",
  });

  stages.push({
    id: "right-swipes",
    value: globalMeta.swipeLikesTotal ?? 0,
    label: "right swipes",
    labelPosition: "right",
    x: rightSwipesX,
    y: row1Y,
    showPath: true,
    prevStageX: totalSwipesX,
    prevStageHalfWidth: totalSwipesWidth / 2,
  });

  // Row 2 (Y=812): Matches and No Match (dropout)
  const matchesX = 550;
  const noMatchX = 800;
  const row2Y = 812;

  stages.push({
    id: "matches",
    value: globalMeta.matchesTotal ?? 0,
    label: "matches",
    labelPosition: "left",
    x: matchesX,
    y: row2Y,
    showPath: true,
    prevStageX: rightSwipesX,
    prevStageHalfWidth: rightSwipesWidth / 2,
  });

  stages.push({
    id: "no-match",
    value: noMatchesTotal,
    label: "no match",
    labelPosition: "right",
    x: noMatchX,
    y: row2Y,
    showPath: true,
    prevStageX: rightSwipesX,
    prevStageHalfWidth: rightSwipesWidth / 2,
    isDropout: true,
    dropoutSide: "right",
  });

  // Row 3 (Y=1068): Chats and No Chats (dropout)
  const chatsX = 400;
  const noChatsX = 600;
  const row3Y = 1068;

  stages.push({
    id: "chats",
    value: globalMeta.conversationsWithMessages ?? 0,
    label: "chats",
    labelPosition: "left",
    x: chatsX,
    y: row3Y,
    showPath: true,
    prevStageX: matchesX,
    prevStageHalfWidth: matchesWidth / 2,
  });

  if (noChats > 0) {
    stages.push({
      id: "no-chats",
      value: noChats,
      label: "no chats",
      labelPosition: "right",
      x: noChatsX,
      y: row3Y,
      showPath: true,
      prevStageX: matchesX,
      prevStageHalfWidth: matchesWidth / 2,
      isDropout: true,
      dropoutSide: "right",
    });
  }

  // Row 4 (Y=1324): Dates and Never Met (dropout) - only if custom data exists
  if (hasCustomData && customData) {
    const datesWidth = calculateStageWidth(
      customData.dateAttended ?? 0,
      maxValue,
      maxWidth,
    );
    const datesX = 300;
    const neverMetX = 500;
    const row4Y = 1324;
    const neverMet =
      globalMeta.conversationsWithMessages - (customData.dateAttended ?? 0);

    stages.push({
      id: "dates",
      value: customData.dateAttended ?? 0,
      label: "dates",
      labelPosition: "left",
      x: datesX,
      y: row4Y,
      showPath: true,
      prevStageX: chatsX,
      prevStageHalfWidth: chatsWidth / 2,
    });

    if (neverMet > 0) {
      stages.push({
        id: "never-met",
        value: neverMet,
        label: "never met",
        labelPosition: "right",
        x: neverMetX,
        y: row4Y,
        showPath: true,
        prevStageX: chatsX,
        prevStageHalfWidth: chatsWidth / 2,
        isDropout: true,
        dropoutSide: "right",
      });
    }

    // Row 5 (Y=1580): Relationships, Casual Sex, No Spark (all shown, may be 0)
    const relationshipsValue = customData.relationshipsStarted ?? 0;
    const casualValue = customData.sleptWithEventually ?? 0;
    const noSparkValue =
      (customData.dateAttended ?? 0) - relationshipsValue - casualValue;
    const relationshipsX = 200;
    const casualX = 400;
    const noSparkX = 550;
    const row5Y = 1580;

    stages.push({
      id: "relationships",
      value: relationshipsValue,
      label: "relationships",
      labelPosition: "below",
      x: relationshipsX,
      y: row5Y,
      showPath: true,
      prevStageX: datesX,
      prevStageHalfWidth: datesWidth / 2,
    });

    stages.push({
      id: "casual-sex",
      value: casualValue,
      label: "casual sex",
      labelPosition: "below",
      x: casualX,
      y: row5Y,
      showPath: true,
      prevStageX: datesX,
      prevStageHalfWidth: datesWidth / 2,
    });

    if (noSparkValue > 0) {
      stages.push({
        id: "no-spark",
        value: noSparkValue,
        label: "no spark",
        labelPosition: "right",
        x: noSparkX,
        y: row5Y,
        showPath: true,
        prevStageX: datesX,
        prevStageHalfWidth: datesWidth / 2,
        isDropout: true,
        dropoutSide: "right",
      });
    }
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg">
      <svg
        viewBox={`0 ${viewBoxStartY} ${viewBoxWidth} ${viewBoxHeight}`}
        className="h-auto w-full"
        role="img"
        aria-label="Dating funnel visualization"
        style={{ maxHeight: "1200px" }}
      >
        <title>Your Tinder Insights</title>
        <desc>
          A funnel visualization showing your Tinder journey from{" "}
          {combinedSwipesTotal.toLocaleString()} total swipes
        </desc>

        <defs>
          {/* Background gradient - SwipeStats subtle rose */}
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.bgGradientStart} />
            <stop offset="100%" stopColor={colors.bgGradientEnd} />
          </linearGradient>

          {/* Rose gradient for dropout paths */}
          <linearGradient
            id="dropoutGradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="30%" stopColor={colors.pathDropoutGradientStart} />
            <stop offset="100%" stopColor={colors.pathDropoutGradientEnd} />
          </linearGradient>

          {/* Drop shadow for bubbles */}
          <filter
            id="bubbleShadow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
            <feOffset dx="0" dy="3" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.4" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect
          x="0"
          y="0"
          width={viewBoxWidth}
          height={viewBoxHeight}
          fill="url(#bgGradient)"
        />

        {/* Title at top - only show in shareable variant */}
        {variant === "shareable" && (
          <text
            x={centerX}
            y="225"
            fill={colors.textTitle}
            fontSize="32"
            fontWeight="bold"
            textAnchor="middle"
          >
            Your Tinder Insights
          </text>
        )}

        {/* Render paths first (so they appear behind bubbles) */}
        {stages.map((stage) => {
          const stageHalfWidth =
            calculateStageWidth(stage.value ?? 0, maxValue, maxWidth) / 2;

          if (
            !stage.showPath ||
            stage.prevStageX === undefined ||
            stage.prevStageHalfWidth === undefined
          ) {
            return null;
          }

          return (
            <g
              key={`${stage.id}-path`}
              transform={`translate(${stage.x},${stage.y})`}
            >
              <path
                d={createTransitionPath(
                  stage.prevStageX,
                  stage.prevStageHalfWidth,
                  stage.x,
                  stageHalfWidth,
                  stageSpacing,
                )}
                fill={
                  stage.isDropout ? "url(#dropoutGradient)" : colors.pathMain
                }
                opacity={
                  stage.isDropout
                    ? colors.pathDropoutOpacity
                    : colors.pathMainOpacity
                }
              />
            </g>
          );
        })}

        {/* Render bubbles and text on top */}
        {stages.map((stage) => {
          const isTopBubble = stage.labelPosition === "above";
          const stageWidth = calculateStageWidth(
            stage.value ?? 0,
            maxValue,
            maxWidth,
          );
          const bubble = calculateBubbleDimensions(stageWidth, isTopBubble);

          return (
            <g key={stage.id} transform={`translate(${stage.x},${stage.y})`}>
              {/* Dropouts don't have bubbles, just text */}
              {stage.isDropout ? (
                <>
                  {/* Dropout with inline label + number (like "left swipes") */}
                  {stage.dropoutSide === "left" && (
                    <text
                      x="0"
                      y="40"
                      fill={colors.textDropout}
                      fontSize="30"
                      textAnchor="middle"
                      opacity={colors.textDropoutOpacity}
                    >
                      {stage.label}{" "}
                      <tspan fontWeight="bold">
                        {(stage.value ?? 0).toLocaleString()}
                      </tspan>
                    </text>
                  )}

                  {/* Dropout with stacked number + label (like "no match") */}
                  {stage.dropoutSide === "right" && (
                    <>
                      <text
                        x="0"
                        y="40"
                        fill={colors.textDropout}
                        fontSize="30"
                        fontWeight="bold"
                        textAnchor="start"
                        opacity={colors.textDropoutOpacity}
                      >
                        {(stage.value ?? 0).toLocaleString()}
                      </text>
                      <text
                        x="0"
                        y="70"
                        fill={colors.textDropout}
                        fontSize="30"
                        textAnchor="start"
                        opacity={colors.textDropoutOpacity}
                      >
                        {stage.label}
                      </text>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* Regular stages have bubbles */}
                  <rect
                    x={bubble.x}
                    y="0"
                    width={bubble.width}
                    height="56"
                    rx="28"
                    ry="28"
                    fill={colors.bubbleFill}
                    filter="url(#bubbleShadow)"
                  />

                  {/* Label text - positioned based on labelPosition */}
                  {stage.labelPosition === "above" ? (
                    // Top bubble - "You swiped X times" inside the bubble
                    <text
                      x="0"
                      y="40"
                      fill={colors.textNumber}
                      fontSize="30"
                      textAnchor="middle"
                    >
                      You swiped{" "}
                      <tspan fontWeight="bold">
                        {(stage.value ?? 0).toLocaleString()}
                      </tspan>
                      <tspan> times</tspan>
                    </text>
                  ) : (
                    // Regular bubbles - just the number inside
                    <text
                      x="0"
                      y="40"
                      fill={colors.textNumber}
                      fontSize="30"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {(stage.value ?? 0).toLocaleString()}
                    </text>
                  )}

                  {/* Side labels for non-top bubbles */}
                  {stage.labelPosition === "left" && (
                    <text
                      x={bubble.x - 20}
                      y="40"
                      fill={colors.textLabel}
                      fontSize="30"
                      textAnchor="end"
                      opacity={colors.textLabelOpacity}
                    >
                      {stage.label}
                    </text>
                  )}

                  {stage.labelPosition === "right" && (
                    <>
                      <text
                        x={bubble.x + bubble.width + 20}
                        y="40"
                        fill={colors.textLabel}
                        fontSize="30"
                        textAnchor="start"
                        opacity={colors.textLabelOpacity}
                      >
                        right
                      </text>
                      <text
                        x={bubble.x + bubble.width + 20}
                        y="70"
                        fill={colors.textLabel}
                        fontSize="30"
                        textAnchor="start"
                        opacity={colors.textLabelOpacity}
                      >
                        swipes
                      </text>
                    </>
                  )}

                  {stage.labelPosition === "below" && (
                    <text
                      x="0"
                      y="90"
                      fill={colors.textLabel}
                      fontSize="30"
                      textAnchor="middle"
                      opacity={colors.textLabelOpacity}
                    >
                      {stage.label}
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}

        {/* Footer text - only show in shareable variant */}
        {variant === "shareable" && (
          <text
            x="970"
            y="1970"
            fill={colors.textFooter}
            fontSize="14"
            textAnchor="end"
            opacity={colors.textFooterOpacity}
          >
            generated with swipestats.io
          </text>
        )}
      </svg>
    </div>
  );
}
