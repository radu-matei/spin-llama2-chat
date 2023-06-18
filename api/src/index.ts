import { HttpRequest, HttpResponse } from "@fermyon/spin-sdk"
import { Configuration, OpenAIApi } from "@ericlewis/openai";

let decoder = new TextDecoder();
let encoder = new TextEncoder();
let router = utils.Router();

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
    let kv = spinSdk.kv.openDefault();
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
    let kv = spinSdk.kv.openDefault();
    kv.delete(id);
    return { status: 200 }
  } catch (err) {
    return error()
  }
});

router.post("/api/generate", async (_req, extra) => {
  try {
    // Open the default KV store.
    let kv = spinSdk.kv.openDefault();
    let configuration = new Configuration({
      apiKey: spinSdk.config.get("openai_key")
    });

    let openai = new OpenAIApi(configuration);

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
    chat.prompts.push({ speaker: 'user', message: p.message });

    let prompt = generatePrompt(chat);

    // Send the entire conversation to OpenAI's API.
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 350,
    });

    let text = completion.data.choices[0].text || "I guess the AI just gave up...";
    chat.prompts.push({ speaker: 'OpenAI', message: text });

    // Write the new state of the conversation to the KV store.
    kv.set(p.id, JSON.stringify(chat));

    // Return the latest response to the user.
    return { status: 200, body: encoder.encode(text).buffer };
  } catch (err) {
    console.log(err);
    return error()
  }
});

// Function to generate the prompt based on the conversation history.
function generatePrompt(chat: Conversation): string {
  let prompt = '';

  for (let i = 0; i < chat.prompts.length; i++) {
    prompt += `${chat.prompts[i].speaker}: ${chat.prompts[i].message}\n`;
  }

  prompt += 'AI: ';

  return prompt;
}

// Function to generate a generic error message.
function error(): HttpResponse {
  return { status: 500, body: encoder.encode("You might want to ask ChatGPT to fix this...").buffer }
}

// The entrypoint to the Spin application.
export async function handleRequest(req: HttpRequest): Promise<HttpResponse> {
  return await router.handleRequest(req, { body: req.body });
}
