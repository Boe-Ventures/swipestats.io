"use client";

import { InfoAlert } from "@/components/ui/alert";
import { GenderForm } from "../../_components/ProfileEnhancement/GenderForm";
import { isGenderDataUnknown } from "@/lib/utils/gender";
import type { SwipestatsProfilePayload } from "@/lib/interfaces/TinderDataJSON";
import type { TinderJsonGender } from "@/server/db/constants";
import type { TinderConsentState } from "@/lib/interfaces/TinderConsent";
import { TinderConsentForm } from "./TinderConsentForm";

interface TinderEnhancementProps {
  payload: SwipestatsProfilePayload;
  onUpdate: (payload: SwipestatsProfilePayload) => void;
  consent: TinderConsentState;
  onConsentChange: (consent: TinderConsentState) => void;
}

export function TinderEnhancement({
  payload,
  onUpdate,
  consent,
  onConsentChange,
}: TinderEnhancementProps) {
  const user = payload.anonymizedTinderJson.User;
  const needsGender =
    isGenderDataUnknown(user.gender) ||
    isGenderDataUnknown(user.interested_in) ||
    isGenderDataUnknown(user.gender_filter);

  const handleGenderUpdate = (data: {
    gender: string;
    genderFilter: string;
    interestedIn: string;
  }) => {
    onUpdate({
      ...payload,
      anonymizedTinderJson: {
        ...payload.anonymizedTinderJson,
        User: {
          ...user,
          gender: data.gender as TinderJsonGender,
          gender_filter: data.genderFilter as TinderJsonGender,
          interested_in: data.interestedIn as TinderJsonGender,
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Gender Confirmation - Required */}
      {needsGender && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Confirm Your Gender Information
            </h3>
          </div>
          <div className="mb-4">
            <InfoAlert>
              Tinder is exporting gender as unknown these days, so we just need
              a quick confirmation.
            </InfoAlert>
          </div>
          <GenderForm
            currentGender={user.gender}
            currentInterestedIn={user.interested_in}
            currentFilter={user.gender_filter}
            onSubmit={handleGenderUpdate}
          />
        </div>
      )}

      {/* Data Sharing Consent Section */}
      {!needsGender && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <TinderConsentForm value={consent} onChange={onConsentChange} />
        </div>
      )}
    </div>
  );
}
