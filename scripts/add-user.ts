import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Hash the password
  const passwordHash = await bcrypt.hash("YourPassword123!", 10);

  // Create workspace for the user
  const workspace = await prisma.workspace.create({
    data: {
      name: "EkoSolarize",
      slug: "ekosolarize",
    },
  });

  // Create the user
  await prisma.user.create({
    data: {
      email: "ekosolarize@gmail.com",
      name: "EkoSolarize",
      passwordHash,
      defaultWorkspaceId: workspace.id,
      memberships: {
        create: {
          workspaceId: workspace.id,
          role: "OWNER",
        },
      },
    },
  });

  console.log(`User created successfully!`);
  console.log(`Email: ekosolarize@gmail.com`);
  console.log(`Password: YourPassword123!`);
  console.log(`Workspace: ${workspace.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });