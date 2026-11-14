export interface HingeConsentState {
  terms: boolean;
  sharePhotos: boolean;
  shareWorkInfo: boolean;
}

export const DEFAULT_HINGE_CONSENT: HingeConsentState = {
  terms: false,
  sharePhotos: true,
  shareWorkInfo: true,
};
