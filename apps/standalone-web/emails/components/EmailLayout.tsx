import * as React from "react";
import {
  Body,
  Container,
  Font,
  Head,
  Html,
  pixelBasedPreset,
  Preview,
} from "@react-email/components";

import { Tailwind } from "@react-email/tailwind";

interface EmailLayoutProps {
  preview?: string;
  children: React.ReactNode;
}

export const EmailLayout = ({
  preview = "SwipeStats",
  children,
}: EmailLayoutProps) => {
  return (
    <Html>
      <Preview>{preview}</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                brand: "#e11d48", // rose-600
              },
            },
          },
        }}
      >
        <Head>
          <Font
            fontFamily="Inter"
            fallbackFontFamily="Arial"
            webFont={{
              url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap",
              format: "woff2",
            }}
            fontWeight={400}
            fontStyle="normal"
          />
        </Head>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto my-10 max-w-xl rounded-xl bg-white px-8 py-8 shadow-sm">
            {children}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
