import { HttpRequest, HttpResponse, Router, Kv, Llm, InferencingModels } from "spin-sdk"

let decoder = new TextDecoder();
let router = Router();

interface Prompt {
  role: string,
  content: string
}

interface Conversation {
  id: string,
  prompts: Prompt[],
}

interface UserPrompt {
  id: string,
  content: string
}

// Return a conversation based on its ID.
router.get("/api/:id", async (req) => {
  let id = req.params.id;
  console.log(`Getting history for conversation ID ${id}`);
  try {
    let kv = Kv.openDefault();
    let body = kv.get(id);

    return { status: 200, body: body }
  } catch (err) {
    console.log(err);
    return error()
  }
});

router.delete("/api/:id", async (req) => {
  let id = req.params.id;
  console.log(`Deleting history for conversation ID ${id}`);
  try {
    let kv = Kv.openDefault();
    kv.delete(id);
    return { status: 200 }
  } catch (err) {
    return error()
  }
});

// The API endpoint that does the LLM inferencing using the chat history as context.
router.post("/api/generate", async (_req, extra) => {
  try {
    // Open the default KV store.
    let kv = Kv.openDefault();

    // Read the conversation ID and message from the request body.
    let p = JSON.parse(decoder.decode(extra.body)) as UserPrompt;

    console.log(`ID: ${p.id}, Content: ${p.content}`);

    // Check the KV store if there is a record for the current conversation ID, otherwise, create a new conversation.
    let chat: Conversation;
    if (kv.exists(p.id)) {
      chat = JSON.parse(decoder.decode(kv.get(p.id)));
    } else {
      chat = { id: p.id, prompts: [] };
      chat.prompts.push(systemPrompt);
    }

    // Add the new message to the prompts.
    chat.prompts.push({ role: 'User', content: p.content });
    let prompt = buildLlama2Prompt(chat.prompts);
    console.log(prompt);

    // This function kicks off the inferencing operation after retrieving the
    // conversation history and using it as context.
    // The context is stored in the KV store, but can also be stored in the new SQL database as embeddings,
    // generated by the new API available in Spin and Fermyon Cloud.
    let completion = Llm.infer(InferencingModels.Llama2Chat, prompt, { max_tokens: 250 });
    console.log(`Inference completed. Usage:`);
    console.log(completion.usage);

    let text = sanitizeOutput(completion.text) || "I guess the AI just gave up...";
    chat.prompts.push({ role: 'Assistant', content: text });

    // Write the new state of the conversation to the KV store.
    kv.set(p.id, JSON.stringify(chat));

    // Return the latest response to the user.
    return { status: 200, body: text };
  } catch (err) {
    console.log("Error generating inference: " + err);
    return error()
  }
});

// let systemPrompt: Prompt = {
//   role: "System", content: `You are a helpful, respectful and honest assistant. Be concise. Always answer as helpfully as possible, while being safe. Always answer as concisely and preceisely as possible. If a question does not make any sense, or is incoherent, explain why instead of answering something incorrect. If you don't know the answer to a question, please avoid false information.
// `};

let systemPrompt: Prompt = {
  role: "System", content: `You are an assistant. Be as concise as possible. Avoid using emojis in responses.`
};


/**
 * A prompt constructor for HuggingFace LLama 2 chat models.
 * @see https://huggingface.co/meta-llama/Llama-2-70b-chat-hf and https://huggingface.co/blog/llama2#how-to-prompt-llama-2
 */
export function buildLlama2Prompt(
  messages: Pick<Prompt, 'content' | 'role'>[]
) {
  const startPrompt = `<s>[INST] `
  const endPrompt = ` [/INST]`
  const conversation = messages.map(({ content, role }, index) => {
    if (role === 'User') {
      return content.trim()
    } else if (role === 'Assistant') {
      return ` [/INST] ${content}</s><s>[INST] `
    } else if (role === 'System' && index === 0) {
      return `<<SYS>>\n${content}\n<</SYS>>\n\n`
    } else {
      throw new Error(`Invalid message role: ${role}`)
    }
  })

  return startPrompt + conversation.join('') + endPrompt
}

// Function to generate a generic error message.
function error(): HttpResponse {
  return { status: 500, body: "You might want to ask ChatGPT to fix this..." }
}

// The entrypoint to the Spin application.
export async function handleRequest(req: HttpRequest): Promise<HttpResponse> {
  return await router.handleRequest(req, { body: req.body });
}

function sanitizeOutput(text: string): string {
  const terminations = [
    "</s><s>[",
    "</s><s>",
    "</s><",
    "</s>",
  ];

  for (const term of terminations) {
    if (text.endsWith(term)) {
      return text.slice(0, -term.length);
    }
  }

  return text;
}
