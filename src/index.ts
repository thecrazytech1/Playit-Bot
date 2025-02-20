import { Client, GatewayIntentBits } from "discord.js";
import * as dotenv from "dotenv";
const natural = require("natural");
import fs from "fs";
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let qaPairs: { [key: string]: string } = {};
const qaFilePath = "./qaPairs.json";

if (fs.existsSync(qaFilePath)) {
  const data = fs.readFileSync(qaFilePath, "utf-8");
  qaPairs = JSON.parse(data);
}

const saveQAPairs = () => {
  fs.writeFileSync(qaFilePath, JSON.stringify(qaPairs, null, 2));
};

client.on("ready", () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

// Listen for messages
client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();
  let replied = false;

  if (content.endsWith("?")) {
    if (qaPairs[content]) {
      // message.reply(qaPairs[content]);
      replied = true;
    } else {
      // message.reply(
      //   "I'll remember this question. If someone answers it, please reply to this message with the answer."
      // );
      replied = true;
    }
  }

  if (message.reference && message.reference.messageId) {
    message.channel.messages
      .fetch(message.reference.messageId)
      .then((questionMessage) => {
        if (questionMessage) {
          const questionContent = questionMessage.content.toLowerCase();
          // Store the answer
          qaPairs[questionContent] = content;
          saveQAPairs();
          // message.reply("Thanks for the answer! I'll remember that.");
          replied = true;
        }
      })
      .catch(console.error);
  }

  if (!replied) {
    const tokenizer = new natural.WordTokenizer();
    const contentTokens = tokenizer.tokenize(content);
    let bestMatch = "";
    let highestScore = 0;

    for (const key in qaPairs) {
      const keyTokens = tokenizer.tokenize(key);
      const score = natural.JaroWinklerDistance(
        contentTokens.join(" "),
        keyTokens.join(" ")
      );
      if (score > highestScore) {
        highestScore = score;
        bestMatch = key;
      }
    }

    if (highestScore > 0.7) {
      // message.reply(qaPairs[bestMatch]);
    } else {
      // message.reply("I'm sorry, I don't understand that question.");
    }
  }
});

client.login(process.env.TOKEN);
