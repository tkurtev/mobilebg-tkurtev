/** Integration tests use a separate database so they never touch development data. */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://mobited:mobited@localhost:5432/mobited_test";
