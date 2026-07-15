import type { SponsorPlacement } from "./sponsorship";

export const INQUIRY_KINDS = ["GENERAL", "SPONSORSHIP"] as const;

export type InquiryKind = (typeof INQUIRY_KINDS)[number];

export interface InquiryData {
  message: string;
  company?: string;
  website?: string;
  budget?: string;
  sourcePath: string;
  placement?: SponsorPlacement;
}
