export const ANONYMOUS_EMAIL_DOMAIN = "@anonymous.swipestats.io";

export function generateUniqueAnonymousEmail(): string {
  const timestamp = Date.now();
  const randomId = crypto.randomUUID().slice(0, 8);
  return `guest-${timestamp}-${randomId}${ANONYMOUS_EMAIL_DOMAIN}`;
}

export function isAnonymousEmail(email: string): boolean {
  return email.includes(ANONYMOUS_EMAIL_DOMAIN);
}
