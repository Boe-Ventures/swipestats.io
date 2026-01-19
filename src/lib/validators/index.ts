/**
 * Centralized Zod validators for SwipeStats
 *
 * This barrel export provides type-safe validators for use across routers, services, and hooks.
 *
 * ## PATTERNS
 *
 * ### 1. DB-backed enums (data providers, genders, message types, etc.)
 * - **Constants**: `src/server/db/constants.ts` (exported arrays derived from schema enums)
 * - **Schema enums**: `src/server/db/schema.ts` (PostgreSQL enum definitions)
 * - **Validators**: Use `z.enum(schemaEnum.enumValues)` to create Zod validators
 *
 * Example:
 * ```typescript
 * import { dataProviderEnum } from "@/server/db/schema";
 * export const mySchema = z.object({
 *   provider: z.enum(dataProviderEnum.enumValues)
 * });
 * ```
 *
 * ### 2. Standalone constants (newsletter topics, billing periods, etc.)
 * - **Constants**: Domain-specific files (e.g., `resend.constants.ts`)
 * - **Pattern**: Export `as const` array → derive type → create z.enum
 * - **Validators**: `src/lib/validators/[domain].ts`
 *
 * Example:
 * ```typescript
 * // In constants file:
 * export const TOPICS = ["topic-a", "topic-b"] as const;
 * export type TopicKey = (typeof TOPICS)[number];
 *
 * // In validator file:
 * import { TOPICS } from "./constants";
 * export const topicSchema = z.enum(TOPICS);
 * ```
 *
 * ## USAGE
 *
 * ### In tRPC routers:
 * ```typescript
 * import { topicKeySchema, emailSchema } from "@/lib/validators";
 *
 * export const myRouter = createTRPCRouter({
 *   myProcedure: publicProcedure
 *     .input(z.object({
 *       email: emailSchema,
 *       topic: topicKeySchema,
 *     }))
 *     .mutation(async ({ input }) => {
 *       // input is fully typed
 *     }),
 * });
 * ```
 *
 * ### In hooks:
 * ```typescript
 * import type { TopicKey } from "@/lib/validators";
 *
 * function useSomething(topic: TopicKey) {
 *   // TypeScript knows topic is a valid topic key
 * }
 * ```
 *
 * ### In services:
 * ```typescript
 * import type { CohortFilter } from "@/lib/validators";
 *
 * function filterCohort(filter: CohortFilter) {
 *   // TypeScript validates filter structure
 * }
 * ```
 *
 * ## BENEFITS
 *
 * 1. **Single source of truth**: Constants defined once, validators derived automatically
 * 2. **Type safety**: TypeScript types inferred from validators
 * 3. **Consistency**: All routers use the same validation patterns
 * 4. **Maintainability**: Adding new values updates validators automatically
 * 5. **Discoverability**: Developers know where to find validators
 * 6. **Testability**: Validators can be unit tested independently
 *
 * ## ADDING NEW VALIDATORS
 *
 * 1. Create a new file in `src/lib/validators/[domain].ts`
 * 2. Define constants (if standalone) or import from schema (if DB-backed)
 * 3. Create Zod schemas using `z.enum()` or `z.object()`
 * 4. Export schemas and inferred types
 * 5. Add export to this barrel file
 * 6. Use in routers via `import { mySchema } from "@/lib/validators"`
 */

// Common validators (emails, IDs, pagination, etc.)
export * from "./common";

// Domain-specific validators
export * from "./newsletter";
export * from "./cohort";
export * from "./billing";
export * from "./custom-data";
