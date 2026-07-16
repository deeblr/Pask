<div align="center">

# PASK

**A Discord-inspired realtime chat platform, built with the MERN stack.**

*A learning project exploring authentication, servers & channels, direct messages, voice rooms, roles/permissions, and a bot gateway.*

![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat-square&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-realtime-010101?style=flat-square&logo=socket.io&logoColor=white)
![License](https://img.shields.io/badge/license-educational-lightgrey?style=flat-square)

</div>

> **Disclaimer:** PASK is not affiliated with, endorsed by, or connected to Discord Inc. in any way. It was built purely for educational purposes — to practice full-stack and realtime application development — and is not intended for commercial use.

---

## Table of Contents

- [Overview](#overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#️-environment-variables)
- [Roadmap](#-roadmap)
- [Author](#-author)
- [License](#-license)

## Overview

PASK re-creates the core experience of a modern chat platform — servers, channels, DMs, voice, roles, and bots — from the ground up. It exists as a hands-on exercise in wiring together the pieces that make realtime apps tick: socket architecture, permission systems, WebRTC signaling, and a token-based bot gateway, all on a standard MERN foundation.

## ✨ Features

| Category | What it does |
|---|---|
| 🔐 **Authentication** | JWT-based signup/login with bcrypt-hashed passwords |
| 🗂️ **Servers & Channels** | Create servers, text/voice/announcement channels, drag-to-reorder |
| 💬 **Realtime Messaging** | Socket.IO-powered chat with typing indicators |
| 📩 **Direct Messages** | 1:1 conversations, including a floating DM panel |
| 🤝 **Friends System** | Friend requests and blocking |
| 🛡️ **Roles & Permissions** | Custom roles, per-role permissions, member management, kick/ban |
| 🎙️ **Voice Rooms** | WebRTC-based voice channels — join/leave, mute/deafen |
| 🤖 **Bots** | Bot accounts with their own gateway/token, addable to servers |
| 🖼️ **File Uploads** | Avatars and server icons via Multer |

## 🧱 Tech Stack

**Backend**
- Node.js / Express
- MongoDB / Mongoose
- Socket.IO — chat, voice signaling, bot gateway
- JWT authentication, bcrypt password hashing
- Multer for file uploads

**Frontend**
- React 18 + Vite
- React Router
- Socket.IO client
- Axios
- Zustand

## 🏗 Architecture

```
┌──────────────┐        REST (Axios)        ┌──────────────┐
│              │ ─────────────────────────► │              │
│   Frontend   │                             │   Backend    │
│  React + Vite│ ◄───────────────────────── │ Express + JWT│
│              │      Socket.IO (realtime)   │              │
│              │ ◄────────────────────────► │  + Mongoose  │
└──────────────┘   chat / voice / bot gateway └──────┬───────┘
                                                       │
                                                       ▼
                                                 ┌─────────────┐
                                                 │  MongoDB    │
                                                 └─────────────┘
```

One Socket.IO layer handles three concerns: chat events, WebRTC signaling for voice rooms, and a separate namespace acting as the bot gateway — so bot accounts authenticate and emit events independently of human users.

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

### 1. Backend

```bash
cd backend
cp .env.example .env   # then fill in your own values
npm install
npm run dev             # or: npm start
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env    # then fill in your own values
npm install
npm run dev
```

The frontend dev server runs on `http://localhost:3000` and proxies API/socket requests to the backend on `http://localhost:8080`.

### 3. Seed demo data (optional)

```bash
cd backend
node seed.js
```

This creates ~50 demo accounts (password: `password123`) and a single demo server, so you can explore the app without manually creating everything.

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

> ⚠️ Never commit real secrets. `.env` files are already excluded via `.gitignore`.

## 🗺 Roadmap

Ideas for future iterations of this learning project:

- [ ] Message search
- [ ] Read receipts / unread badges
- [ ] Screen sharing in voice rooms
- [ ] Push notifications
- [ ] Dockerized setup for one-command local dev

## 👤 Author

Built by **Deeblr** — a personal project made to learn and gain hands-on experience with full-stack and realtime web development.

[![Twitter](https://img.shields.io/badge/Twitter-@deebllr-1DA1F2?style=for-the-badge&logo=x&logoColor=white)](https://twitter.com/your_username)
[![Discord](https://img.shields.io/badge/Discord-deeblr1-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/users/your_username)

## 📄 License

This project is provided as-is, for educational purposes only.
