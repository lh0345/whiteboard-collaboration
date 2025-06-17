
# 🎨 Real-Time Collaborative Whiteboard (Distributed Systems)

A full-stack collaborative whiteboard application demonstrating core **Distributed Systems** concepts such as real-time communication, event synchronization, microservices architecture, concurrency control, and cloud scalability. Users can draw together in real time across different rooms with persistent session history.

---

## 🚀 Live Features

- ✏️ **Multi-user Drawing**: Real-time canvas drawing with live updates
- 🧍 **User Presence**: See who’s online and drawing in real time
- 🛠 **Drawing Tools**: Color picker, brush size, eraser
- 🔐 **Secure Rooms**: Password-protected with creator tokens
- 💾 **Drawing Persistence**: All events saved to MongoDB with TTL cleanup
- 📱 **Responsive Design**: Tailwind-powered UI using shadcn/ui
- 🌐 **Socket.IO WebSocket**: Bi-directional, low-latency sync

---

## 🧠 Distributed Systems Concepts Demonstrated

| Concept                        | Description                                                                 |
|-------------------------------|-----------------------------------------------------------------------------|
| Architecture in DS            | Clean separation of frontend/backend/db with real-time interfaces          |
| Interprocess Communication    | Socket.IO WebSocket messaging                                               |
| RESTful Design Principles     | Stateless room management logic via WebSocket-compatible REST patterns      |
| Microservices Architecture    | Independent, containerizable services                                       |
| Time & Clock Synchronization | Timestamps and logical event ordering                                       |
| Transaction & Concurrency     | Optimistic updates + atomic persistence                                    |
| Cloud Readiness (AWS)         | Scalable deployment design with auto-cleanup and WebSocket scaling support  |

---

## 🛠 Tech Stack

### 🌐 Frontend
- React 18 + TypeScript
- Fabric.js v6
- Tailwind CSS + shadcn/ui
- Socket.IO Client

### 🔧 Backend
- Node.js + Express
- Socket.IO Server
- MongoDB + Mongoose
- UUID, CORS, dotenv

### ⚙️ Dev Tools
- Vite
- ESLint + Prettier
- TSConfig Paths
- .env Configurations

---

## 📁 Project Structure

```plaintext
📦 project-root
 ┣ 📂 src/
 ┃ ┣ 📂 pages/              # Index (home), Whiteboard, NotFound
 ┃ ┣ 📂 components/ui/      # Reusable Tailwind-based UI components
 ┃ ┣ 📂 hooks/              # Custom React hooks (toasts, mobile detection)
 ┃ ┣ 📂 lib/                # Utility functions
 ┃ ┣ 📜 App.tsx            # Main React router + providers
 ┃ ┣ 📜 main.tsx           # React app entry
 ┃ ┣ 📜 socketService.ts   # WebSocket logic (Socket.IO)
 ┣ 📂 server/
 ┃ ┣ 📜 index.js            # Main backend server
 ┃ ┣ 📂 models/Room.js      # MongoDB Room schema (with TTL indexing)
 ┣ 📜 package.json (x2)     # Frontend and backend dependencies
 ┣ 📜 tailwind.config.ts    # Tailwind customization
 ┣ 📜 vite.config.ts        # Vite + Socket proxy
 ┣ 📜 .env.example          # Environment template
```

---

## 🧪 Run Locally

1. **Clone the repo**
   ```bash
   git clone https://github.com/yourusername/distributed-whiteboard.git
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../server
   npm install
   ```

4. **Start MongoDB locally or use MongoDB Atlas**

5. **Configure environment**
   - Copy `.env.example` to `.env`
   - Set `MONGODB_URI` and `PORT`

6. **Run both frontend and backend**
   ```bash
   # Backend
   npm run dev

   # Frontend (in separate terminal)
   cd frontend
   npm run dev
   ```

---

## 🌩 Deployment

- Docker-ready setup possible
- AWS-ready architecture: compatible with ECS, DocumentDB, ALB WebSocket routing
- Can be integrated with Redis for WebSocket clustering

---

## 📘 License

MIT © 2025 Leart Hiseni

---

## 💡 Author

**Leart Hiseni** — CST student passionate about scalable systems and real-time apps.
