import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  anonymousClient,
  usernameClient,
} from "better-auth/client/plugins";
import type { auth } from "./config";

export const authClient = createAuthClient({
  plugins: [
    usernameClient(),
    adminClient(), // should i have admin client or only user server?

    anonymousClient(),
  ],
});

export type Session = typeof auth.$Infer.Session;
