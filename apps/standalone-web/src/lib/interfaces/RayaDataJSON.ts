export interface RayaUserExport {
  first_name?: string;
  last_name?: string;
  birth_date: string;
  gender: string;
  email_address: string;
  occupation?: string;
  instagram_username?: string;
  residence_location?: string;
  company_name?: string;
  company?: string;
  status?: string;
  website?: string;
  profile_image?: string;
  slideshow_images?: Array<{ id?: string; url?: string }>;
}

export interface RayaMatchExport {
  match_type: string;
  liked: boolean;
  created_at: string;
}

export interface RayaMessageExport {
  sender: string;
  body: string;
  created_at: string;
}

export interface RayaSwipeExport {
  user: string;
  type: string;
  liked: boolean;
  swiped_at: string;
}

export interface RayaDailyUsage {
  date: string;
  likes: number;
  passes: number;
  matches: number;
  messagesSent: number;
}

export interface AnonymizedRayaDataJSON {
  User: {
    birth_date: string;
    gender: string;
    occupation?: string;
    residence_location?: string;
    company?: string;
    status?: string;
    instagram_connected: boolean;
    website_connected: boolean;
    photos: string[];
  };
  Usage: RayaDailyUsage[];
  Summary: {
    likes: number;
    passes: number;
    matches: number;
    messagesSent: number;
    firstActivityAt: string;
    lastActivityAt: string;
  };
}

export interface SwipestatsRayaProfilePayload {
  rayaId: string;
  anonymizedRayaJson: AnonymizedRayaDataJSON;
}

export type RayaArchiveFiles = Record<string, string>;
