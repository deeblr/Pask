# PASK

PASK is a Discord-inspired chat platform built with the MERN stack (MongoDB, Express, React, Node.js) and Socket.IO for realtime communication. It was built as a **learning project** to practice building a full realtime chat application end-to-end — authentication, servers/channels, direct messages, voice rooms, roles/permissions, and a bot gateway.

> **Disclaimer:** This project is not affiliated with, endorsed by, or connected to Discord Inc. in any way. It was created purely for educational purposes, to learn and practice full-stack and realtime application development. It is not intended for commercial use.

## ✨ Features

- **Authentication** — JWT-based signup/login
- **Servers & Channels** — create servers, text/voice/announcement channels, drag-to-reorder
- **Realtime messaging** — Socket.IO powered chat with typing indicators
- **Direct messages** — 1:1 conversations, including a floating DM panel
- **Friends system** — friend requests, blocking
- **Roles & permissions** — custom roles, per-role permissions, member management, kick/ban
- **Voice rooms** — WebRTC-based voice channels (join/leave, mute/deafen)
- **Bots** — bot accounts with their own gateway/token, can be added to servers and send messages
- **File uploads** — avatars and server icons

## 🧱 Tech Stack

**Backend**
- Node.js / Express
- MongoDB / Mongoose
- Socket.IO (chat, voice signaling, bot gateway)
- JWT authentication, bcrypt password hashing
- Multer for file uploads

**Frontend**
- React 18 + Vite
- React Router
- Socket.IO client
- Axios
- Zustand

## 📁 Project Structure

```
PaskDiscord-main/
├── backend/
│   ├── middleware/     # auth & permission checks
│   ├── models/         # Mongoose schemas (User, Server, Channel, Message, Role, Bot, DirectMessage)
│   ├── routes/         # REST API endpoints
│   ├── socket/         # Socket.IO handlers (chat/voice + bot gateway)
│   ├── seed.js         # generates demo users/server for local testing
│   └── server.js       # app entry point
└── frontend/
    └── src/
        ├── components/ # UI components (chat, dm, friends, server, sidebar, voice, ui)
        ├── context/     # React context providers (auth, servers, DMs)
        ├── pages/       # top-level routed pages
        └── utils/       # API client & socket setup
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A MongoDB instance (local or Atlas)

### Backend

```bash
cd backend
cp .env.example .env   # then fill in your own values
npm install
npm run dev             # or: npm start
```

### Frontend

```bash
cd frontend
cp .env.example .env    # then fill in your own values
npm install
npm run dev
```

The frontend dev server runs on `http://localhost:3000` and proxies API/socket requests to the backend on `http://localhost:8080`.

### Seeding demo data (optional)

```bash
cd backend
node seed.js
```

This creates ~50 demo accounts (password: `password123`) and a single demo server so you can explore the app without manually creating everything.

## ⚙️ Environment Variables

**backend/.env**
| Variable | Description |
|---|---|
| `PORT` | Port the backend listens on |
| `MONGO_URL` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign JWTs — set your own value |
| `CLIENT_URL` | URL of the frontend (used for CORS) |

**frontend/.env**
| Variable | Description |
|---|---|
| `VITE_API_URL` | URL of the backend API |
| `VITE_CLIENT_URL` | URL of the frontend itself |

> Never commit real secrets. `.env` files are already excluded via `.gitignore`.

## 👤 Author

Built by **Deeblr** — a personal project made to learn and gain hands-on experience with full-stack and realtime web development.

[![Twitter](https://img.shields.io/badge/Twitter-@deebllr-1DA1F2?style=for-the-badge&logo=x&logoColor=white)](https://twitter.com/your_username)
[![Discord](https://img.shields.io/badge/Discord-deeblr1-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/users/your_username)
## 📄 License

This project is provided as-is for educational purposes.
