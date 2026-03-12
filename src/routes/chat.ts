import { Elysia } from "elysia";
import { readdirSync, readFileSync } from "fs";
import { join, relative } from "path";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const docsDirectory = "./docs";

function getAllDocsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      return getAllDocsFiles(fullPath);
    }
    return [fullPath];
  });
}

function buildDocsContext(): string {
  const files = getAllDocsFiles(docsDirectory).sort((a, b) =>
    a.localeCompare(b),
  );

  return files
    .map((filePath) => {
      const fileName = relative(docsDirectory, filePath);
      const content = readFileSync(filePath, "utf-8");
      return `ARQUIVO: ${fileName}\n${content}`;
    })
    .join("\n\n");
}

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

  let docsContext = "";
  try {
    docsContext = buildDocsContext();
  } catch {
    set.status = 500;
    return {
      error: "Nao foi possivel ler os arquivos da pasta docs.",
    };
  }

  if (!docsContext.trim()) {
    set.status = 500;
    return {
      error: "Nenhum documento encontrado na pasta docs.",
    };
  }

  const prompt = `
Responda apenas usando os documentos abaixo.
Se a resposta nao estiver nos documentos, diga:
"Não tenho essa informação registrada nos materiais que possuo. Você pode verificar diretamente no painel do cliente ou no canal de suporte."

DOCUMENTOS:
${docsContext}

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
