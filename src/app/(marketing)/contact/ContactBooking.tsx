"use client";

import { useEffect } from "react";
import Cal, { getCalApi } from "@calcom/embed-react";

export default function ContactBooking() {
  useEffect(() => {
    const initCal = async () => {
      try {
        const cal = await getCalApi({ namespace: "swipestats-contact" });
        cal("ui", {
          hideEventTypeDetails: false,
          layout: "month_view",
        });
      } catch (error) {
        console.error("Failed to initialize Cal.com:", error);
      }
    };

    void initCal();
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-900/5">
      <Cal
        namespace="swipestats-contact"
        calLink="kristianeboe/30min"
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          minHeight: "600px",
        }}
        config={{
          layout: "month_view",
        }}
      />
    </div>
  );
}
