# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm run install:all
```

This will install dependencies for:
- Root (concurrently for running both servers)
- Backend (Express, OpenAI, WebSocket)
- Frontend (React, Vite, Tailwind, Framer Motion)

## Step 2: Configure OpenAI API Key

1. Copy the example environment file:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Edit `backend/.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-actual-key-here
   ```

## Step 3: Start the Application

Run both servers simultaneously:
```bash
npm run dev
```

Or run them separately in two terminals:
```bash
# Terminal 1
npm run dev:backend

# Terminal 2  
npm run dev:frontend
```

## Step 4: Open in Browser

Visit: **http://localhost:5173**

## What You'll See

1. A beautiful landing page where you can enter a debate topic
2. Once you start a debate, you'll see:
   - Agent A (Theorist) - Blue bubbles
   - Agent B (Critic) - Green bubbles  
   - Agent C (Researcher) - Gray bubbles
3. Real-time updates as agents debate
4. Smooth animations and modern chat UI

## Troubleshooting

- **Backend won't start**: Make sure you've set `OPENAI_API_KEY` in `backend/.env`
- **Frontend can't connect**: Ensure backend is running on port 3001
- **WebSocket errors**: Check that both servers are running and ports aren't blocked

## Next Steps

- Customize agent prompts in `backend/src/agents/agentSystem.js`
- Adjust debate settings (max rounds, etc.) in the frontend
- Add web search functionality for Agent C (currently just provides research notes)

