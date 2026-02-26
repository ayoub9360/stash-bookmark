import { router, publicProcedure } from "../trpc.js";
import { loginSchema } from "@stash/shared";
import { TRPCError } from "@trpc/server";

export const authRouter = router({
  login: publicProcedure.input(loginSchema).mutation(({ input }) => {
    if (input.password !== process.env.PASSWORD) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });
    }
    return { success: true };
  }),

  verify: publicProcedure.query(({ ctx }) => {
    return { authenticated: ctx.isAuthenticated };
  }),
});
