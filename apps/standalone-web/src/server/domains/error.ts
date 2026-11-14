export type DomainErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_SERVER_ERROR"
  | "PRECONDITION_FAILED"
  | "TOO_MANY_REQUESTS";

/** Business failures remain independent of their HTTP or tool projection. */
export class DomainError extends Error {
  readonly code: DomainErrorCode;
  constructor(options: {
    code: DomainErrorCode;
    message?: string;
    cause?: unknown;
  }) {
    super(options.message ?? options.code, { cause: options.cause });
    this.name = "DomainError";
    this.code = options.code;
  }
}
