import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";

import { prisma } from "@/lib/prisma";

async function resolveWorkspaceMeta(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        defaultWorkspace: {
          select: { id: true, name: true },
        },
        memberships: {
          select: {
            workspace: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    if (!user) {
      return null;
    }

    const workspace = user.defaultWorkspace ?? user.memberships[0]?.workspace;
    if (!workspace) {
      return null;
    }

    if (!user.defaultWorkspaceId) {
      await prisma.user.update({
        where: { id: userId },
        data: { defaultWorkspaceId: workspace.id },
      });
    }

    return workspace;
  } catch (error) {
    console.error("Error resolving workspace metadata:", error);
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/sign-in",
    newUser: "/sign-up",
  },
  debug: process.env.NODE_ENV === "development",
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          if (!credentials?.email || !credentials.password) {
            return null;
          }

          const email = credentials.email.toLowerCase();
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user?.passwordHash) {
            return null;
          }

          const isValid = await compare(credentials.password, user.passwordHash);
          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      try {
        if (user) {
          token.sub = user.id;
          token.email = user.email;
          token.name = user.name;
          const workspace = await resolveWorkspaceMeta(user.id);
          if (workspace) {
            token.workspaceId = workspace.id;
            token.workspaceName = workspace.name;
          }
        } else if (token.sub && !token.workspaceId) {
          const workspace = await resolveWorkspaceMeta(token.sub);
          if (workspace) {
            token.workspaceId = workspace.id;
            token.workspaceName = workspace.name;
          }
        }

        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (session.user && token.sub) {
          session.user.id = token.sub;
          session.user.email = token.email as string | undefined;
          session.user.name = token.name as string | undefined;
          if (token.workspaceId) {
            session.user.workspaceId = token.workspaceId as string;
            session.user.workspaceName = token.workspaceName as string | undefined;
          }
        }

        return session;
      } catch (error) {
        console.error("Session callback error:", error);
        return session;
      }
    },
  },
};
