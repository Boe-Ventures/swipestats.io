import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, ArrowRight } from "lucide-react";

export function AnonymousUpgradeCard() {
  return (
    <Card className="flex h-full flex-col border-amber-200 bg-amber-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-amber-600" />
          Upgrade Account
        </CardTitle>
        <CardDescription className="text-sm text-amber-800">
          Create a free account to secure your data and never lose your insights
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <ul className="space-y-2 text-sm text-amber-900">
          <li>• Secure your data permanently</li>
          <li>• Access from any device</li>
          <li>• Share with friends</li>
        </ul>
      </CardContent>
      <CardFooter className="mt-auto">
        <Link href="/signup" className="w-full">
          <Button
            size="default"
            className="w-full bg-amber-600 text-white transition-all hover:bg-amber-700"
          >
            Create Free Account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
