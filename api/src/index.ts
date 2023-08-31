import { HttpRequest, HttpResponse, Router, Kv, Llm, InferencingModels } from "spin-sdk"

let decoder = new TextDecoder();
let router = Router();

interface Prompt {
  speaker: string,
  message: string
}

interface Conversation {
  id: string,
  prompts: Prompt[],
}

interface UserPrompt {
  id: string,
  message: string
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

router.post("/api/generate", async (_req, extra) => {
  try {
    // Open the default KV store.
    let kv = Kv.openDefault();

    // Read the conversation ID and message from the request body.
    let p = JSON.parse(decoder.decode(extra.body)) as UserPrompt;

    console.log(`ID: ${p.id}, Message: ${p.message}`);

    // Check the KV store if there is a record for the current conversation ID, otherwise, create a new conversation.
    let chat: Conversation;
    if (kv.exists(p.id)) {
      chat = JSON.parse(decoder.decode(kv.get(p.id)));
    } else {
      chat = { id: p.id, prompts: [] };
    }

    // Add the new message to the prompts.
    chat.prompts.push({ speaker: 'User', message: p.message });
    let prompt = generatePrompt(chat);

    let completion = Llm.infer(InferencingModels.Llama2Chat, prompt, { max_tokens: 100 });
    console.log(completion);

    let text = completion.text || "I guess the AI just gave up...";
    chat.prompts.push({ speaker: 'Assistant', message: text });

    // Write the new state of the conversation to the KV store.
    kv.set(p.id, JSON.stringify(chat));

    // Return the latest response to the user.
    return { status: 200, body: text };
  } catch (err) {
    console.log("Error generating inference: " + err);
    return error()
  }
});

// Function to generate the prompt based on the conversation history.
function generatePrompt(chat: Conversation): string {
  let prompt = '';
  // prompt += `System: You are a helpful, respectful and honest assistant. Always answer as helpfully as possible, while being safe.  Your answers should not include any harmful, unethical, racist, sexist, toxic, dangerous, or illegal content. Please ensure that your responses are socially unbiased and positive in nature. If a question does not make any sense, or is not factually coherent, explain why instead of answering something not correct. If you don't know the answer to a question, please don't share false information. You are a chat application. NEVER continue a prompt by generating a User question.\n`;

  for (let i = 0; i < chat.prompts.length; i++) {
    prompt += `${chat.prompts[i].speaker}: ${chat.prompts[i].message}\n`;
  }

  prompt += 'Assistant: ';

  return prompt;
}

// Function to generate a generic error message.
function error(): HttpResponse {
  return { status: 500, body: "You might want to ask ChatGPT to fix this..." }
}

// The entrypoint to the Spin application.
export async function handleRequest(req: HttpRequest): Promise<HttpResponse> {
  return await router.handleRequest(req, { body: req.body });
}
