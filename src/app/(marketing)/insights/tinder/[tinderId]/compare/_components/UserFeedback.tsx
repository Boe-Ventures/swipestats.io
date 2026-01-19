"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { StarRatingFormField } from "@/components/ui/formFields/RadioGroupFormField";
import { TagGroupFormField } from "@/components/ui/formFields/TagGroupFormField";
import { useLocalStorage } from "@/components/ui/hooks/use-local-storage";
// import { useTRPC } from "@/trpc/react"; // TODO: Re-enable when misc.submitFeedback router is available
// import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const FormSchema = z.object({
  experienceRating: z.number().min(1).max(5).nullable(),
  howDoTheResultsMakeYouFeel: z
    .enum(["happy", "sad", "neutral", "surprised", "disheartened"])
    .array(),
});

export function UserFeedback({ tinderId }: { tinderId: string }) {
  // TODO: Re-enable tRPC mutation when misc.submitFeedback router is available
  // const trpc = useTRPC();
  const [feedbackSubmittedLocal, setFeedbackSubmittedLocal] = useLocalStorage({
    key: "feedbackSubmitted",
    defaultValue: false,
  });

  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFeedbackSubmitted(feedbackSubmittedLocal);
  }, [feedbackSubmittedLocal]);

  // Stubbed mutation - replace with actual tRPC call when available
  // const submitFeedbackMutation = useMutation(
  //   trpc.misc.submitFeedback.mutationOptions({
  //     onSuccess: () => {
  //       setFeedbackSubmittedLocal(true);
  //       toast.success("Feedback submitted");
  //     },
  //   }),
  // );

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      experienceRating: null,
      howDoTheResultsMakeYouFeel: [],
    },
  });

  const onSubmit = async (values: z.infer<typeof FormSchema>) => {
    setIsSubmitting(true);

    // TODO: Replace with actual tRPC mutation when misc.submitFeedback router is available
    // submitFeedbackMutation.mutate({
    //   ...values,
    //   tinderId: tinderId,
    // });

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log("Feedback submitted (local only):", { ...values, tinderId });
    setFeedbackSubmittedLocal(true);
    setIsSubmitting(false);
    toast.success("Feedback submitted! (Demo mode - not saved to server)");
  };

  if (feedbackSubmitted) {
    return (
      <Card className="w-full shrink">
        <CardHeader>
          <div className="mb-4 flex items-center justify-center">
            <CheckCircleIcon className="text-primary h-16 w-16" />
          </div>
          <CardTitle className="text-center text-2xl sm:text-3xl">
            Thank You for Your Feedback!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center">
            We appreciate you taking the time to share your thoughts with us.
            Your feedback is invaluable in helping us improve SwipeStats.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center"></CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full shrink">
      <CardHeader>
        <CardTitle>How is your experience with SwipeStats?</CardTitle>
        <CardDescription>
          Please take a moment to provide your feedback.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="">
            <div className="mb-4 grid gap-4">
              <StarRatingFormField
                label="How would you rate your overall experience?"
                name="experienceRating"
                options={[1, 2, 3, 4, 5]}
              />

              <div className="grid gap-2">
                <TagGroupFormField
                  label="How do the results make you feel?"
                  name="howDoTheResultsMakeYouFeel"
                  options={[
                    { label: "Happy", value: "happy" },
                    { label: "Sad", value: "sad" },
                    { label: "Neutral", value: "neutral" },
                    { label: "Surprised", value: "surprised" },
                    { label: "Disheartened", value: "disheartened" },
                  ]}
                />
              </div>
            </div>
            <div className="flex">
              <Button loading={isSubmitting}>Submit Feedback</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
