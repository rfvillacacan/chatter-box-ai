# 💬 Chatter - AI Debate Room

A beautiful, real-time multi-agent debate system where AI agents discuss complex topics in a modern chat interface.

## Features

- 🤖 **Three AI Agents**: Theorist, Critic, and Researcher
- 🎨 **Beautiful UI**: Modern chat interface with smooth animations
- ⚡ **Real-time Updates**: WebSocket-based live conversation
- 🎯 **Smart Controller**: Orchestrates debate flow and keeps conversations going
- 📱 **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **Backend**: Node.js + Express + WebSocket
- **Frontend**: React + TypeScript + Tailwind CSS + Framer Motion
- **AI**: OpenAI API (GPT-4o-mini)

## Setup

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Configure Environment

Copy the example environment file and add your OpenAI API key:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and add your OpenAI API key:

```
OPENAI_API_KEY=your_key_here
```

### 3. Run the Application

Start both backend and frontend:

```bash
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

### 4. Open in Browser

Visit [http://localhost:5173](http://localhost:5173)

## Usage

1. Enter a topic or question you want the agents to debate
2. Watch as Agent A (Theorist), Agent B (Critic), and Agent C (Researcher) discuss the topic
3. The conversation continues automatically with smooth animations
4. Start a new debate anytime

## Project Structure

```
chatter/
├── backend/
│   ├── src/
│   │   ├── controller/    # Debate orchestrator
│   │   ├── agents/        # Agent system with OpenAI
│   │   └── routes/        # API routes
│   └── server.js          # Express + WebSocket server
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   └── types.ts       # TypeScript types
│   └── ...
└── project-context.md     # Architecture documentation
```

## Customization

- **Max Rounds**: Adjust `maxRounds` in the debate options
- **Researcher Frequency**: Change `researcherInterval` (default: every 3 rounds)
- **AI Model**: Modify the model in `backend/src/agents/agentSystem.js` (currently `gpt-4o-mini`)

## License

MIT

