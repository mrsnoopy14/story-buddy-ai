# Story Buddy - Real-Time AI Conversation

This project implements the assignment **Real-Time AI Conversation (Image → 1-Minute Child Interaction)**.

## What it does

- Shows an engaging image on the screen.
- Starts a **1-minute voice conversation** between an AI "Story Buddy" and a child based on that image.
- Uses the **Web Speech API** in the browser for text-to-speech (AI voice) and speech recognition (child voice) where supported.
- Sends conversation turns to a small **Express backend** that calls an OpenAI-compatible model.
- Demonstrates at least one **tool call** from the AI that changes the UI (e.g. background color or reward sticker).

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Configure your API key by creating a `.env` file in the project root:

```bash
OPENAI_API_KEY=your_real_key_here
```

3. Run the server:

```bash
npm run dev
```

4. Open the app:

Visit http://localhost:3000 in a supported browser (Chrome works best for the Web Speech API).

## Notes

- If speech recognition is not available in your browser, the AI will still speak but may not hear responses.
- The AI is instructed to speak like a friendly storyteller to a 6-year-old child and to keep the conversation light, short, and related to the image shown.
