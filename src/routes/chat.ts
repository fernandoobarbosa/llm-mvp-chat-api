import { Elysia } from "elysia";
import { readFileSync } from "fs";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const document = readFileSync("./docs/documento.txt", "utf-8");
const googleModel = process.env.GOOGLE_MODEL ?? "gemini-2.0-flash";

const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: googleModel,
});

type ChatBody = {
  message?: string;
};

export const chatRoutes = new Elysia().post("/chat", async ({ body, set }) => {
  if (!process.env.GOOGLE_API_KEY) {
    set.status = 500;
    return {
      error: "GOOGLE_API_KEY nao configurada no ambiente.",
    };
  }

  const { message } = body as ChatBody;

  if (typeof message !== "string" || !message.trim()) {
    set.status = 400;
    return {
      error: "Body invalido. Use { message: 'sua pergunta' }.",
    };
  }

  const prompt = `
Responda apenas usando o documento abaixo.

DOCUMENTO:
${document}

PERGUNTA:
${message}
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

  return { response: content };
});
