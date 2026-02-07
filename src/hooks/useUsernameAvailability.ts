import { useState, useEffect } from "react";
import { authClient } from "@/server/better-auth/client";

export function useUsernameAvailability(username: string) {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkUsername = async () => {
      if (username.length >= 3) {
        if (username.includes("@")) {
          setIsAvailable(false);
          setIsChecking(false);
          return;
        }

        setIsChecking(true);
        try {
          const { data } = await authClient.isUsernameAvailable({ username });
          setIsAvailable(data?.available ?? false);
        } catch (err) {
          console.error("Username check error:", err);
          setIsAvailable(null);
        } finally {
          setIsChecking(false);
        }
      } else {
        setIsAvailable(null);
        setIsChecking(false);
      }
    };

    const timer = setTimeout(() => void checkUsername(), 500);
    return () => clearTimeout(timer);
  }, [username]);

  return { isAvailable, isChecking };
}
