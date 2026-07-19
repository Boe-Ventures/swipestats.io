import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "swipestats";

export const Anatomy = () => (
  <Card className="w-full max-w-sm">
    <CardHeader>
      <CardTitle>Match rate</CardTitle>
      <CardDescription>Tinder · all time</CardDescription>
    </CardHeader>
    <CardContent>
      <span className="text-3xl font-bold tracking-tight tabular-nums">
        19.9%
      </span>
    </CardContent>
    <CardFooter>
      <Button size="sm" variant="outline">
        View details
      </Button>
    </CardFooter>
  </Card>
);

export const StatRow = () => (
  <div className="grid w-full max-w-2xl grid-cols-3 gap-4">
    {[
      ["Total swipes", "38,608"],
      ["Matches", "4,345"],
      ["Avg response", "1h 9m"],
    ].map(([label, value]) => (
      <Card key={label}>
        <CardHeader>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        </CardHeader>
      </Card>
    ))}
  </div>
);

export const WithBadge = () => (
  <Card className="w-full max-w-sm">
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle>Premium insights</CardTitle>
        <Badge>New</Badge>
      </div>
      <CardDescription>
        Compare against 7,000+ anonymized profiles.
      </CardDescription>
    </CardHeader>
    <CardFooter>
      <Button size="sm">Unlock</Button>
    </CardFooter>
  </Card>
);
