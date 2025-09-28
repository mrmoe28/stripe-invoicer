import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function testLogin() {
  const email = "ekosolarize@gmail.com";
  const password = "Chanon28$";
  
  console.log("Testing login credentials...");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log("----------------------------");

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            workspace: true
          }
        },
        defaultWorkspace: true
      }
    });

    if (!user) {
      console.log("❌ User not found!");
      return;
    }

    console.log("✅ User found!");
    console.log(`   Name: ${user.name}`);
    console.log(`   ID: ${user.id}`);

    // Verify password
    if (!user.passwordHash) {
      console.log("❌ No password set for user!");
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (isValid) {
      console.log("✅ Password is correct!");
      console.log("\nUser's workspace information:");
      if (user.defaultWorkspace) {
        console.log(`   Default Workspace: ${user.defaultWorkspace.name} (${user.defaultWorkspace.slug})`);
      }
      if (user.memberships.length > 0) {
        console.log("   All workspaces:");
        user.memberships.forEach(m => {
          console.log(`   - ${m.workspace.name} (Role: ${m.role})`);
        });
      }
      console.log("\n🎉 Login test successful! You can use these credentials to sign in.");
    } else {
      console.log("❌ Password is incorrect!");
    }
  } catch (error) {
    console.error("Error testing login:", error);
  }
}

testLogin()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });