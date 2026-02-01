import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getSession } from "@/server/better-auth/server";
import { trpc, HydrateClient, prefetch } from "@/trpc/server";
import { ProfileForm } from "./ProfileForm";
import { EmailVerificationForm } from "./EmailVerificationForm";
import { DatingAppsForm } from "./DatingAppsForm";
import { SelfAssessmentForm } from "./SelfAssessmentForm";
import { LocationForm } from "./LocationForm";
import { DeleteAccountButton } from "./DeleteAccountButton";
import { NewsletterPreferencesForm } from "./NewsletterPreferencesForm";
import { SubscriptionCard } from "./SubscriptionCard";

export const metadata = {
  title: "Account Settings - SwipeStats",
  description: "Manage your SwipeStats account settings and preferences.",
};

export default async function AccountPage() {
  const session = await getSession();

  if (!session) {
    redirect("/signin");
  }

  // Prefetch user data
  prefetch(trpc.user.me.queryOptions());

  return (
    <HydrateClient>
      <div className="mx-auto max-w-2xl space-y-8 sm:space-y-10">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Account Settings</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Manage your profile data and account security.
          </p>
        </div>

        {/* Profile & Analytics Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Profile & Analytics</h2>
            <p className="text-muted-foreground text-sm">
              Information used for personalized insights and comparisons
            </p>
          </div>

          <div className="space-y-6">
            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Your location affects cohort comparisons and analytics. Update
                  to compare with users in your region.
                </p>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div>Loading...</div>}>
                  <LocationForm />
                </Suspense>
              </CardContent>
            </Card>

            {/* Dating Apps Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Dating Apps</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Track which dating apps you&apos;re currently active on to get
                  relevant insights and comparisons.
                </p>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div>Loading...</div>}>
                  <DatingAppsForm />
                </Suspense>
              </CardContent>
            </Card>

            {/* Self Assessment */}
            <Card>
              <CardHeader>
                <CardTitle>Self Assessment</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Rate yourself to understand how self-perception relates to
                  your dating app performance.
                </p>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div>Loading...</div>}>
                  <SelfAssessmentForm />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Email Preferences Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Email Preferences</h2>
            <p className="text-muted-foreground text-sm">
              Choose what emails you&apos;d like to receive from us
            </p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Newsletter Topics</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Select which topics you&apos;re interested in receiving emails
                  about.
                </p>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div>Loading preferences...</div>}>
                  <NewsletterPreferencesForm />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Subscription & Billing Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Subscription & Billing</h2>
            <p className="text-muted-foreground text-sm">
              Manage your SwipeStats subscription and billing information
            </p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Plan</CardTitle>
                <p className="text-muted-foreground text-sm">
                  View your current subscription status and manage your billing.
                </p>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div>Loading subscription...</div>}>
                  <SubscriptionCard />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Account & Security Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Account & Security</h2>
            <p className="text-muted-foreground text-sm">
              Manage your login credentials and account access
            </p>
          </div>

          <div className="space-y-6">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Basic account information for login and identification.
                </p>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div>Loading...</div>}>
                  <ProfileForm />
                </Suspense>
              </CardContent>
            </Card>

            {/* Email Verification */}
            <Card>
              <CardHeader>
                <CardTitle>Email Verification</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Verify your email to enable password reset and important
                  account notifications.
                </p>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div>Loading...</div>}>
                  <EmailVerificationForm />
                </Suspense>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Irreversible and destructive actions for your account.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4">
                  <p className="text-sm">
                    Once you delete your account, there is no going back. All
                    your data including dating app profiles, matches, and
                    messages will be permanently removed.
                  </p>
                  <DeleteAccountButton />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </HydrateClient>
  );
}
