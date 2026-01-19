import * as React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/EmailLayout";

interface EmailVerificationProps {
  verificationUrl: string;
}

export const EmailVerification = ({
  verificationUrl = "https://swipestats.io/verify-email?token=abc123",
}: EmailVerificationProps) => {
  return (
    <EmailLayout preview="Verify your email address to unlock all SwipeStats features">
      <Heading className="mb-6 text-3xl font-semibold text-gray-900">
        Verify your email address
      </Heading>
      <Text className="mb-4 text-base leading-6 text-gray-700">
        Thanks for upgrading your SwipeStats account! Please verify your email
        address to enable password reset and secure your account.
      </Text>
      <Section className="my-8">
        <Button
          href={verificationUrl}
          className="bg-brand rounded-lg px-6 py-3 text-center text-base font-semibold text-white no-underline shadow-sm hover:opacity-90"
        >
          Verify Email Address
        </Button>
      </Section>
      <Text className="mb-4 text-base leading-6 text-gray-700">
        If you didn't request this verification email, you can safely ignore it.
      </Text>
      <Text className="text-sm text-gray-500">
        This verification link will expire in 24 hours for security reasons.
      </Text>
    </EmailLayout>
  );
};

export default EmailVerification;
