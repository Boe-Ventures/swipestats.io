export interface TinderConsentState {
  photos: boolean;
  work: boolean;
  terms: boolean;
}

export const DEFAULT_TINDER_CONSENT: TinderConsentState = {
  photos: true,
  work: true,
  terms: false, // Must be explicitly accepted
};
