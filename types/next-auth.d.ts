import { DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      workspaceId: string;
      workspaceName?: string | null;
    };
  }

  interface User extends DefaultUser {
    defaultWorkspaceId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    workspaceId?: string;
    workspaceName?: string;
  }
}
