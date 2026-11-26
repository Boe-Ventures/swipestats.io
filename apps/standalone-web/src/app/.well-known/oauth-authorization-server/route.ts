import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";

import { auth } from "@/server/better-auth";

export const GET = oauthProviderAuthServerMetadata(auth);
