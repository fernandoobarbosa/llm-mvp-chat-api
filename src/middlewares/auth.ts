import { Elysia } from "elysia";

const apiKey = process.env.API_KEY;

export const authMiddleware = new Elysia().onBeforeHandle(({ headers, set }) => {
  if (!apiKey) {
    set.status = 500;
    return {
      error: "API_KEY nao configurada no ambiente.",
    };
  }

  const authHeader = headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : undefined;

  if (!token || token !== apiKey) {
    set.status = 401;
    return {
      error: "Nao autorizado. Use Authorization: Bearer <API_KEY>.",
    };
  }
});