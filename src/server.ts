import { Elysia } from "elysia";
import { readFileSync } from "fs";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const document = readFileSync("./docs/documento.txt", "utf-8");
const googleModel = process.env.GOOGLE_MODEL ?? "gemini-2.0-flash";

const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: googleModel,
});
const apiKey = process.env.API_KEY;

const app = new Elysia();

type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

app.post("/api/chat/message", async ({ body, headers, set }) => {
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

  const { messages } = body as { messages?: OpenAIMessage[] };

  if (!Array.isArray(messages) || messages.length === 0) {
    set.status = 400;
    return {
      error: "Body invalido. Use { messages: [{ role, content }] }.",
    };
  }

  const conversation = messages
    .filter((m) => typeof m?.content === "string" && typeof m?.role === "string")
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const prompt = `
Responda apenas usando o documento abaixo.

DOCUMENTO:
${document}

CONVERSA:
${conversation}
`;

  const response = await model.invoke(prompt);

  const content = Array.isArray(response.content)
    ? response.content
        .map((part) =>
          typeof part === "string"
            ? part
            : typeof part === "object" && part && "text" in part
              ? String(part.text)
              : "",
        )
        .join("")
    : String(response.content ?? "");

  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: googleModel,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content,
        },
        finish_reason: "stop",
      },
    ],
  };
});

app.listen(3000);

console.log("Server running on http://localhost:3000");