import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Hash the new password
  const passwordHash = await bcrypt.hash("Chanon28$", 10);

  // Update the user's password
  await prisma.user.update({
    where: {
      email: "ekosolarize@gmail.com",
    },
    data: {
      passwordHash,
    },
  });

  console.log(`Password updated successfully!`);
  console.log(`Email: ekosolarize@gmail.com`);
  console.log(`New Password: Chanon28$`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });