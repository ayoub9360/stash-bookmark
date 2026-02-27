import { useState, useEffect, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { setLoggedIn } from "@/lib/auth";
import { trpc } from "@/lib/trpc";

const WAIT_SECONDS_RE = /wait (\d+) seconds/;
const TRY_AGAIN_RE = /Try again in (\d+) seconds/;

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  const login = trpc.auth.login.useMutation({
    onSuccess: () => {
      setLoggedIn();
      setLockedUntil(null);
      setCountdown(0);
      navigate({ to: "/" });
    },
    onError: (err) => {
      const message = err.message;
      setError(message);

      // Parse wait time from error message
      const waitMatch = message.match(WAIT_SECONDS_RE);
      const tryAgainMatch = message.match(TRY_AGAIN_RE);
      const seconds = waitMatch?.[1] ?? tryAgainMatch?.[1];

      if (seconds) {
        const lockDuration = parseInt(seconds, 10) * 1000;
        const until = Date.now() + lockDuration;
        setLockedUntil(until);
        setCountdown(parseInt(seconds, 10));
      }
    },
  });

  // Countdown timer
  useEffect(() => {
    if (!lockedUntil) return;

    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setCountdown(0);
        setError("");
        clearInterval(interval);
      } else {
        setCountdown(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || login.isPending) return;
    setError("");
    login.mutate({ password: pwd });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Bookmark className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Stash</CardTitle>
          <CardDescription>Enter your password to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoFocus
              disabled={isLocked}
            />
            {error && (
              <p className="text-sm text-destructive">
                {isLocked ? `Too many attempts. Retry in ${countdown}s.` : error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={login.isPending || isLocked}>
              {login.isPending
                ? "Signing in..."
                : isLocked
                  ? `Locked (${countdown}s)`
                  : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
