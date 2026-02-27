import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { loginSchema } from "@stash/shared";
import { TRPCError } from "@trpc/server";
import { generateSessionToken, COOKIE_NAME, COOKIE_OPTIONS } from "../session.js";

// --- Rate limiting state ---
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BASE_DELAY_MS = 1000; // 1 second base delay, doubles each attempt

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

const attempts = new Map<string, LoginAttempt>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of attempts) {
    if (now - data.firstAttempt > WINDOW_MS) {
      attempts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

function getDelayMs(failCount: number): number {
  if (failCount <= 0) return 0;
  // 1s, 2s, 4s, 8s, 16s
  return BASE_DELAY_MS * Math.pow(2, failCount - 1);
}

export const authRouter = router({
  login: publicProcedure.input(loginSchema).mutation(async ({ input, ctx }) => {
    const ip = ctx.ip;
    const now = Date.now();
    const record = attempts.get(ip);

    // Clean expired window
    if (record && now - record.firstAttempt > WINDOW_MS) {
      attempts.delete(ip);
    }

    const current = attempts.get(ip);

    // Check if locked out (max attempts reached)
    if (current && current.count >= MAX_ATTEMPTS) {
      const unlockAt = current.firstAttempt + WINDOW_MS;
      const retryAfterSec = Math.ceil((unlockAt - now) / 1000);
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Too many failed attempts. Try again in ${retryAfterSec} seconds.`,
      });
    }

    // Check progressive delay (must wait between attempts)
    if (current && current.count > 0) {
      const delay = getDelayMs(current.count);
      const elapsed = now - current.lastAttempt;
      if (elapsed < delay) {
        const waitSec = Math.ceil((delay - elapsed) / 1000);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Please wait ${waitSec} seconds before trying again.`,
        });
      }
    }

    // Validate password
    if (input.password !== process.env.PASSWORD) {
      // Record failed attempt
      if (current) {
        current.count++;
        current.lastAttempt = now;
      } else {
        attempts.set(ip, { count: 1, firstAttempt: now, lastAttempt: now });
      }

      const failCount = attempts.get(ip)!.count;

      // Add server-side delay to slow down automated attacks
      const delay = getDelayMs(failCount);
      await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 3000)));

      if (failCount >= MAX_ATTEMPTS) {
        const retryAfterSec = Math.ceil(WINDOW_MS / 1000);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many failed attempts. Try again in ${retryAfterSec} seconds.`,
        });
      }

      const remaining = MAX_ATTEMPTS - failCount;
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: `Invalid password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      });
    }

    // Success — clear attempts for this IP
    attempts.delete(ip);

    // Set httpOnly session cookie
    const token = generateSessionToken();
    ctx.res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    return { success: true };
  }),

  verify: publicProcedure.query(({ ctx }) => {
    return { authenticated: ctx.isAuthenticated };
  }),

  logout: protectedProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, { path: "/" });
    return { success: true };
  }),
});
