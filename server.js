import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize OpenAI client if an API key is provided.
// When no key is set, the server will fall back to a simple local
// storyteller so the demo still works without external calls.
const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

const tools = [
  {
    type: 'function',
    function: {
      name: 'changeBackgroundColor',
      description: 'Change the background color of the app to match the mood of the story.',
      parameters: {
        type: 'object',
        properties: {
          color: {
            type: 'string',
            description: 'Any valid CSS color name or hex code, e.g. "#ffcc00" or "skyblue".'
          }
        },
        required: ['color']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'showRewardSticker',
      description: 'Show a fun reward sticker on the screen.',
      parameters: {
        type: 'object',
        properties: {
          sticker: {
            type: 'string',
            description: 'A short name for the sticker, e.g. "star", "unicorn", "trophy".'
          }
        },
        required: ['sticker']
      }
    }
  }
];

app.post('/api/chat', async (req, res) => {
  try {
    const { history, imageDescription } = req.body || {};

    const messages = [
      {
        role: 'system',
        content:
          'You are a friendly storyteller AI talking to a 6-year-old child. ' +
          'You see an illustration with this description: ' + (imageDescription || '') +
          '. Start and keep a short, gentle conversation for about one minute. ' +
          'Ask simple questions, encourage imagination, and keep replies under 2 sentences.'
      },
      ...(Array.isArray(history) ? history : [])
    ];
    let contentText = '';
    let toolCall = null;

    if (!openai) {
      // Fallback: simple local storyteller logic when no API key is set.
      const safeHistory = Array.isArray(history) ? history : [];
      const lastUser = safeHistory.filter(m => m.role === 'user').slice(-1)[0];
      const lastAssistant = safeHistory.filter(m => m.role === 'assistant').slice(-1)[0];
      const childSaid = lastUser?.content || '';

      const cannedOpeners = [
        'Wow, this scene looks so fun! What do you think the children are building?',
        'I see bright colors and toys everywhere. What is your favorite thing in this picture?',
        'It looks like everyone is having a great time. What would you like to play with here?'
      ];

      const followUps = [
        'I like that idea! What else could happen next in this picture?',
        'That sounds fun! Can you tell me one more thing you notice in the picture?',
        'Cool! If you were there, what would you do next?',
        'Nice thinking. Can you imagine a little story that happens here?'
      ];

      if (!history || history.length === 0 || !lastAssistant) {
        contentText = cannedOpeners[Math.floor(Math.random() * cannedOpeners.length)];
      } else if (!childSaid) {
        contentText = 'I am listening. Can you tell me one thing you notice in the picture?';
      } else {
        // Pick a follow-up that is not identical to the last assistant line, for variety.
        let candidate = followUps[Math.floor(Math.random() * followUps.length)];
        if (lastAssistant && lastAssistant.content === candidate) {
          candidate = followUps[(followUps.indexOf(candidate) + 1) % followUps.length];
        }
        contentText = candidate;
      }

      // Occasionally trigger a simple UI tool call for the demo.
      const uiChance = Math.random();
      if (uiChance < 0.25) {
        // Change background to one of a few playful colors.
        const colors = ['#0f172a', '#1e293b', '#022c22', '#312e81'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        toolCall = {
          name: 'changeBackgroundColor',
          arguments: { color }
        };
      } else if (uiChance < 0.35) {
        // Occasionally show a reward sticker.
        const stickers = ['star', 'trophy', 'unicorn'];
        const sticker = stickers[Math.floor(Math.random() * stickers.length)];
        toolCall = {
          name: 'showRewardSticker',
          arguments: { sticker }
        };
      }
    } else {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.8,
        max_tokens: 150
      });

      const choice = completion.choices[0];
      const message = choice.message;

      contentText = message.content || '';

      if (message.tool_calls && message.tool_calls.length > 0) {
        const tc = message.tool_calls[0];
        try {
          const args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
          toolCall = {
            name: tc.function?.name,
            arguments: args
          };
        } catch (e) {
          // If parsing fails, ignore the tool call.
          toolCall = null;
        }
      }
    }

    res.json({
      role: 'assistant',
      content: contentText,
      toolCall
    });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: 'Failed to generate response from AI.' });
  }
});

// Fallback to index.html for root
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
