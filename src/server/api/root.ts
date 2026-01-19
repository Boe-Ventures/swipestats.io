import { postRouter } from "@/server/api/routers/postRouter";
import { userRouter } from "@/server/api/routers/userRouter";
import { blobRouter } from "@/server/api/routers/blobRouter";
import { profileCompareRouter } from "@/server/api/routers/profileCompareRouter";
import { profileRouter } from "@/server/api/routers/profileRouter";
import { hingeProfileRouter } from "@/server/api/routers/hingeProfileRouter";
import { adminRouter } from "@/server/api/routers/adminRouter";
import { directoryRouter } from "@/server/api/routers/directoryRouter";
import { eventRouter } from "@/server/api/routers/eventRouter";
import { customDataRouter } from "@/server/api/routers/customDataRouter";
import { newsletterRouter } from "@/server/api/routers/newsletterRouter";
import { billingRouter } from "@/server/api/routers/billingRouter";
import { researchRouter } from "@/server/api/routers/researchRouter";
import { cohortRouter } from "@/server/api/routers/cohortRouter";
import { matchRouter } from "@/server/api/routers/matchRouter";
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
  admin: adminRouter,
  directory: directoryRouter,
  event: eventRouter,
  customData: customDataRouter,
  newsletter: newsletterRouter,
  billing: billingRouter,
  research: researchRouter,
  cohort: cohortRouter,
  match: matchRouter,
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
