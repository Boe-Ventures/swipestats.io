import { loveStoriesRouter } from "./loveStories/router";
import { apiKeysRouter } from "./apiKeys/router";
import { connectionsRouter } from "./connections/router";
import { postRouter } from "./post/router";
import { userRouter } from "./user/router";
import { blobRouter } from "./blob/router";
import { profileCompareRouter } from "./profileCompare/router";
import { profileRouter } from "./profile/router";
import { hingeProfileRouter } from "./hingeProfile/router";
import { rayaProfileRouter } from "./rayaProfile/router";
import { adminRouter } from "./admin/router";
import { directoryRouter } from "./directory/router";
import { eventRouter } from "./event/router";
import { customDataRouter } from "./customData/router";
import { newsletterRouter } from "./newsletter/router";
import { billingRouter } from "./billing/router";
import { researchRouter } from "./research/router";
import { matchRouter } from "./match/router";
import { roastRouter } from "./roast/router";
import { promptSuggestRouter } from "./promptSuggest/router";
import { photoAnalysisRouter } from "./photoAnalysis/router";
import { profileComposeRouter } from "./profileCompose/router";
import { consentRouter } from "./consent/router";
import { catalogRouter } from "./catalog/router";
import { inquiryRouter } from "./inquiry/router";
import { swipeRankRouter } from "./swipeRank/router";
import type { RouterClient } from "@orpc/server";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const domainRouter = {
  apiKeys: apiKeysRouter,
  loveStories: loveStoriesRouter,
  connections: connectionsRouter,
  post: postRouter,
  user: userRouter,
  blob: blobRouter,
  profileCompare: profileCompareRouter,
  profile: profileRouter,
  hingeProfile: hingeProfileRouter,
  rayaProfile: rayaProfileRouter,
  admin: adminRouter,
  directory: directoryRouter,
  event: eventRouter,
  customData: customDataRouter,
  newsletter: newsletterRouter,
  billing: billingRouter,
  research: researchRouter,
  match: matchRouter,
  roast: roastRouter,
  promptSuggest: promptSuggestRouter,
  photoAnalysis: photoAnalysisRouter,
  profileCompose: profileComposeRouter,
  consent: consentRouter,
  catalog: catalogRouter,
  inquiry: inquiryRouter,
  swipeRank: swipeRankRouter,
};

export type DomainRouter = typeof domainRouter;
export type DomainClient = RouterClient<DomainRouter>;
