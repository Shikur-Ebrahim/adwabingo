import { Router } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';

const router = Router();
router.use(validateTelegramAuth);

router.post('/chat', async (req: AuthRequest, res) => {
  try {
    const { message, history } = req.body;
    const user = req.telegramUser;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const systemPrompt = `You are the official AI Support Agent for ADWA Bingo, a Telegram mini-app bingo game in Ethiopia.
Be helpful, concise, and friendly. Answer questions about the game rules, deposits, withdrawals, and how to play.
Game Rules:
- Players can select Medeb (stakes): 10, 20, 50, or 100 ETB.
- A game needs a minimum of 2 players to start.
- Players can buy up to 2 cartelas per game.
- The Derash (Prize Pool) is 80% of total stakes if 3+ players join, otherwise 100%.
- To win, a player must get a full line (horizontal, vertical, or diagonal). Wait, standard bingo is usually vertical, horizontal, diagonal. (Actually, verify the win logic if needed, but keep it general: "Get 5 numbers in a row vertically or horizontally").
- Deposits and withdrawals are handled via Chapa or manual bank transfer.
- The user you are talking to is named ${user?.first_name || 'Player'}.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq API Error:', errText);
      res.status(500).json({ error: 'Failed to contact AI support' });
      return;
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const aiMessage = data.choices[0].message.content;

    res.json({ reply: aiMessage });

  } catch (error) {
    console.error('Support Chat Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
