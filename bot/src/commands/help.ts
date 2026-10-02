import { Context } from 'grammy';

export async function helpCommand(ctx: Context) {
  await ctx.reply(
    `🎱 *ADWA Bingo — How to Play*\n\n` +
    `*Setup:*\n` +
    `1️⃣ /newgame — Create a room (auto-joins as host)\n` +
    `2️⃣ Share room code with friends\n` +
    `3️⃣ Friends do /join CODE\n` +
    `4️⃣ /startgame — Host starts (min. 2 players)\n\n` +
    `*Gameplay:*\n` +
    `5️⃣ Host presses 🎲 Call Number\n` +
    `6️⃣ Open Mini App to see & mark your card\n` +
    `7️⃣ Numbers auto-highlight on your card\n` +
    `8️⃣ Complete a line → press 🏆 BINGO!\n\n` +
    `*Winning Patterns:*\n` +
    `➡️ Any row (5 across)\n` +
    `⬆️ Any column (5 down)\n` +
    `↗️ Either diagonal\n` +
    `⭐ Center = FREE space\n\n` +
    `*Bingo Card Numbers:*\n` +
    `B: 1–15 | I: 16–30 | N: 31–45\n` +
    `G: 46–60 | O: 61–75`,
    { parse_mode: 'Markdown' }
  );
}
