import { execSync } from "node:child_process";
import "dotenv/config";

export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Testler için TEST_DATABASE_URL tanımlayın.");
  execSync("npx prisma migrate reset --force --skip-seed --skip-generate", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });
}
