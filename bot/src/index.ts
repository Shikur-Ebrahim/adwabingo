import { Bot } from 'grammy';
import dotenv from 'dotenv';
dotenv.config();

import { startCommand } from './commands/start';
import { handleCallback } from './handlers/callback';

async function main() {
  const bot = new Bot(process.env.BOT_TOKEN!);

  bot.command('start', startCommand);
  bot.on('callback_query:data', handleCallback);

  bot.catch((err) => {
    console.error(`Bot error for update ${err.ctx.update.update_id}:`, err.error);
  });

  await bot.start({ onStart: (info) => console.log(`🤖 @${info.username} is running!`) });
}

main().catch(console.error);
