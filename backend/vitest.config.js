import os from "node:os";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: "./tests/globalSetup.js",
    fileParallelism: false,
    env: { NODE_ENV: "test", UPLOAD_DIR: path.join(os.tmpdir(), "futurecoders-test-uploads") },
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
