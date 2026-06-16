import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import {
  sendPasswordResetEmail,
  sendVerificationEmail as sendVerificationEmailMessage,
} from "@/lib/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, token }) => {
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
      await sendPasswordResetEmail({ to: user.email, url });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmailMessage({ to: user.email, url });
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  session: {
    cookieCache: {
      enabled: false, // disabled — each getSession() reads from DB so role changes take effect immediately
    },
  },

  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },

  // Expose role in session so middleware can read it without a DB call
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "customer",
        input: false, // not settable by the client
      },
      firstName: {
        type: "string",
        required: false,
        input: true,
      },
      lastName: {
        type: "string",
        required: false,
        input: true,
      },
    },
    // Changing your email requires verifying the new address before it
    // takes effect. The existing emailVerification.sendVerificationEmail
    // callback (above) is reused to send the confirmation link.
    changeEmail: {
      enabled: true,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
