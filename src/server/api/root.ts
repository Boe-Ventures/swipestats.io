import { postRouter } from "@/server/api/routers/postRouter";
import { userRouter } from "@/server/api/routers/userRouter";
import { blobRouter } from "@/server/api/routers/blobRouter";
import { profileCompareRouter } from "@/server/api/routers/profileCompareRouter";
import { profileRouter } from "@/server/api/routers/profileRouter";
import { hingeProfileRouter } from "@/server/api/routers/hingeProfileRouter";
import { rayaProfileRouter } from "@/server/api/routers/rayaProfileRouter";
import { adminRouter } from "@/server/api/routers/adminRouter";
import { directoryRouter } from "@/server/api/routers/directoryRouter";
import { eventRouter } from "@/server/api/routers/eventRouter";
import { customDataRouter } from "@/server/api/routers/customDataRouter";
import { newsletterRouter } from "@/server/api/routers/newsletterRouter";
import { billingRouter } from "@/server/api/routers/billingRouter";
import { researchRouter } from "@/server/api/routers/researchRouter";
import { cohortRouter } from "@/server/api/routers/cohortRouter";
import { matchRouter } from "@/server/api/routers/matchRouter";
import { roastRouter } from "@/server/api/routers/roastRouter";
import { promptSuggestRouter } from "@/server/api/routers/promptSuggestRouter";
import { photoAnalysisRouter } from "@/server/api/routers/photoAnalysisRouter";
import { profileComposeRouter } from "@/server/api/routers/profileComposeRouter";
import { consentRouter } from "@/server/api/routers/consentRouter";
import { catalogRouter } from "@/server/api/routers/catalogRouter";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
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
  cohort: cohortRouter,
  match: matchRouter,
  roast: roastRouter,
  promptSuggest: promptSuggestRouter,
  photoAnalysis: photoAnalysisRouter,
  profileCompose: profileComposeRouter,
  consent: consentRouter,
  catalog: catalogRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
