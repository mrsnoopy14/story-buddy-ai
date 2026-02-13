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
      const lastUser = (Array.isArray(history) ? history : []).filter(m => m.role === 'user').slice(-1)[0];
      const childSaid = lastUser?.content || '';

      const cannedOpeners = [
        'Wow, this scene looks so fun! What do you think the children are building?',
        'I see bright colors and toys everywhere. What is your favorite thing in this picture?',
        'It looks like everyone is having a great time. What would you like to play with here?'
      ];

      if (!history || history.length === 0) {
        contentText = cannedOpeners[Math.floor(Math.random() * cannedOpeners.length)];
      } else {
        contentText = childSaid
          ? `I like that idea! What else could happen next in this picture?`
          : `I am listening. Can you tell me one thing you notice in the picture?`;
      }

      // Occasionally trigger a simple UI tool call for the demo.
      if (Math.random() < 0.4) {
        toolCall = {
          name: 'changeBackgroundColor',
          arguments: { color: '#0f172a' }
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
