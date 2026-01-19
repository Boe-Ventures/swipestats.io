export interface HingeConsentState {
  terms: boolean;
  sharePhotos: boolean;
  shareWorkInfo: boolean;
  shareMatches: boolean;
  shareMessages: boolean;
  sharePrompts: boolean;
}

export const DEFAULT_HINGE_CONSENT: HingeConsentState = {
  terms: false,
  sharePhotos: true,
  shareWorkInfo: true,
  shareMatches: true,
  shareMessages: true,
  sharePrompts: true,
};
