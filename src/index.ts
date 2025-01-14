import { Client, GatewayIntentBits, Events } from "discord.js";
import * as dotenv from "dotenv";
import tesseract from "node-tesseract-ocr";
import Fuse from "fuse.js";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const errorResponses: { [key: string]: string } = {
  "minecraft connection issues":
    "It seems you're having trouble connecting to your Minecraft server. Here are some steps you can try:\n1. Check if the server is running.\n2. Ensure you have the correct domain address and port (or try the IP instead of the domain).\n3. Verify your firewall settings to allow Minecraft connections.\n4. Restart your server and try again.",
};

const synonymousPhrases: string[] = [
  "failed to connect to the server",
  "connection refused: no further information",
];

const fuse = new Fuse(synonymousPhrases, {
  includeScore: true,
  threshold: 0.3,
});

function containsErrorMessage(message: string): string | null {
  const lowerCaseMessage = message.toLowerCase();
  console.log("Lowercase Message:", lowerCaseMessage);

  const results = fuse.search(lowerCaseMessage);
  if (results.length > 0) {
    const bestMatch = results[0];

    if (bestMatch && bestMatch.score !== undefined && bestMatch.score < 0.3) {
      return "minecraft connection issues";
    }
  }
  return null;
}

async function processImage(imageUrl: string): Promise<string> {
  const text = await tesseract.recognize(imageUrl);
  return text;
}

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const messageContent = message.content;
  const matchedPhrase = containsErrorMessage(messageContent);
  if (matchedPhrase) {
    message.channel.send(errorResponses[matchedPhrase]);
  }

  if (message.attachments.size > 0) {
    const attachment = message.attachments.first();
    if (attachment && attachment.url) {
      try {
        const extractedText = await processImage(attachment.url);
        const matchedPhraseFromImage = containsErrorMessage(extractedText);
        if (matchedPhraseFromImage) {
          message.channel.send(errorResponses[matchedPhraseFromImage]);
        }
      } catch (error) {
        console.error("Error processing image:", error);
        message.channel.send("I couldn't process the image. Please try again.");
      }
    }
  }
});

client.login(process.env.TOKEN);
