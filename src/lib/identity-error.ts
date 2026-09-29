export type IdentityErrorCode =
  | "file_type"
  | "file_size"
  | "rate"
  | "invalid"
  | "unauthorized"
  | "not_eligible"
  | "unreadable"
  | "storage"
  | "sheet"
  | "gemini";

export class IdentityError extends Error {
  constructor(public code: IdentityErrorCode) {
    super(code);
  }
}

export function identityErrorStatus(code: IdentityErrorCode): number {
  switch (code) {
    case "unauthorized":
    case "not_eligible":
      return 403;
    case "file_size":
      return 413;
    case "rate":
      return 429;
    case "unreadable":
      return 422;
    case "storage":
    case "gemini":
      return 503;
    case "sheet":
      return 502;
    default:
      return 400;
  }
}
