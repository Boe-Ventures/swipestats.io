import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/components/ui";

export function RoastBannerPlaceholder() {
  return (
    <Card className="border-2 border-dashed">
      <CardContent className="py-8 text-center">
        <p className="text-muted-foreground text-lg font-medium">
          AI Roast Coming Soon
        </p>
      </CardContent>
    </Card>
  );
}

export function DataRequestCTAPlaceholder() {
  return (
    <Card className="border-2 border-dashed">
      <CardHeader>
        <CardTitle>Need Help Requesting Your Data?</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Data Request Help Coming Soon</p>
      </CardContent>
    </Card>
  );
}

export function SwipestatsPlusCardPlaceholder({
  className,
}: {
  className?: string;
}) {
  return (
    <Card className={cn("border-2 border-dashed", className)}>
      <CardHeader>
        <CardTitle>SwipeStats+</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">SwipeStats+ Coming Soon</p>
      </CardContent>
    </Card>
  );
}

export function ProfilesPlaceholder() {
  return (
    <div className="flex justify-center gap-4">
      <Card className="border-2 border-dashed">
        <CardContent className="py-6 text-center">
          <p className="text-muted-foreground text-sm">
            Profile Comparison Coming Soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function UserFeedbackPlaceholder() {
  return (
    <Card className="border-2 border-dashed">
      <CardHeader>
        <CardTitle>Feedback</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Feedback Form Coming Soon
        </p>
      </CardContent>
    </Card>
  );
}
