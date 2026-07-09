/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  setupFiles: ["<rootDir>/tests/setup-env.ts"],
  globalSetup: "<rootDir>/tests/global-setup.ts",
  testMatch: ["**/tests/**/*.test.ts"],
  testTimeout: 30000,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/index.ts",
    "!src/seed.ts",
  ],
};
