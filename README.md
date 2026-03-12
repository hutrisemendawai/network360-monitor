<p align="center">
  <img src="frontend/src/img/network360.png" alt="Network360" height="80"/>
</p>

<h1 align="center">Network360</h1>

<p align="center">
  <strong>Real-time network monitoring dashboard with animated ping visualization, dynamic latency charts, and smart alerting.</strong>
</p>

<p align="center">
  <a href="https://github.com/hutrisemendawai">
    <img src="https://img.shields.io/badge/by-hutrisemendawai-14b8a6?style=flat-square&logo=github" alt="Author"/>
  </a>
  <img src="https://img.shields.io/badge/SvelteKit-FF3E00?style=flat-square&logo=svelte&logoColor=white" alt="SvelteKit"/>
  <img src="https://img.shields.io/badge/PocketBase-B8DBE4?style=flat-square&logo=pocketbase&logoColor=white" alt="PocketBase"/>
  <img src="https://img.shields.io/badge/TailwindCSS_v4-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white" alt="TailwindCSS"/>
  <img src="https://img.shields.io/badge/GSAP-88CE02?style=flat-square&logo=greensock&logoColor=white" alt="GSAP"/>
  <img src="https://img.shields.io/badge/Chart.js-FF6384?style=flat-square&logo=chartdotjs&logoColor=white" alt="Chart.js"/>
  <img src="https://img.shields.io/badge/Node.js-v18+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js"/>
</p>

---

## ✨ Features

### 🖥️ Real-Time Dashboard
- **Card-based monitoring** — Each target host is displayed in an interactive card with a premium glassmorphism design
- **Status indicators** — 🟢 Healthy, 🟡 Spike, 🔴 Down / Packet Loss — visible at a glance
- **Stats overview** — Summary of total, running, and stopped monitors

### 🎯 Ping Packet Animation (GSAP)
- Visual animation of a data packet traveling from **[PC]** to **[Server]** along a connection line
- **Animation speed tied to latency** — low latency = fast, high latency = slow
- **Packet loss effect** — packet stops midway, shakes, and fades to red

### 📊 Dynamic Latency Charts (Chart.js)
- **Real-time line chart** displaying the last 50 pings
- **Moving average line (green)** — rolling average calculated from all data points, auto-updated
- **Spike threshold band (yellow)** — +20% above average as a spike warning zone
- **Dynamic segment colors** — green (normal), yellow (spike), red (packet loss)

### 🔔 Smart Alerting System
- **Consecutive loss tracking** — counts sequential packet losses per monitor
- **Card pulse animation** — card flashes bright red when losses exceed the configured threshold
- **Toast notifications** — on-screen alerts with detailed messages when threshold is breached
- **User-configurable threshold** — each monitor can have its own alert tolerance

### 🔐 Authentication
- Login & Register with email/password via PocketBase Auth
- Automatic session management
- Auth guard — redirects to login if not authenticated

### ⚙️ Monitor CRUD
- **Add Monitor** — Add a new target with name, host (IP/domain), ping interval, and alert threshold
- **Edit Monitor** — Update any monitor's configuration at any time
- **Delete Monitor** — Remove monitors that are no longer needed
- **Start / Stop / Restart** — Control ping state directly from the dashboard

---

## 🏗️ Architecture

```
network360/
├── frontend/          ← SvelteKit + TailwindCSS v4 (UI Dashboard)
├── worker/            ← Node.js Ping Engine (ICMP Worker)
└── pocketbase/        ← PocketBase (Auth + DB + Realtime SSE)
```

### Tech Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Frontend** | SvelteKit / Svelte 5 | `^2.50` / `^5.51` | SSR + client-side routing, reactive UI with runes |
| **Styling** | TailwindCSS v4 | `^4.2` | Dark theme, glassmorphism, responsive layout |
| **Animation** | GSAP | `^3.14` | Ping packet travel animation |
| **Charts** | Chart.js | `^4.5` | Real-time line chart with moving avg & spike band |
| **Backend** | PocketBase | `^0.26` | Auth, SQLite database, real-time SSE subscriptions |
| **Worker** | Node.js + `ping` | `^0.4` | ICMP ping engine that writes results to PocketBase |

### Data Flow

```
[User] → Dashboard (SvelteKit)
              │
              │  1. CRUD monitors via PocketBase API
              │  2. Subscribe to real-time SSE events
              ▼
         [PocketBase]  ←───── 3. Worker writes ping_logs
              │
              │  4. SSE broadcast to all subscribers
              ▼
         Dashboard updates:
         • GSAP animation fires
         • Chart.js appends new data point
         • Status indicator changes
         • Alert triggered if threshold exceeded
```

---

## 📦 Database Schema

### `monitors` — Ping target configuration

| Field | Type | Description |
|-------|------|-------------|
| `user` | Relation → users | Owner of the monitor (cascade delete) |
| `name` | Text (1–200) | Monitor label, e.g. `"Main DB Server"` |
| `target_host` | Text (1–255) | IP or domain, e.g. `1.1.1.1` or `google.com` |
| `interval_ms` | Number | Ping interval in milliseconds (min 500) |
| `alert_threshold_sec` | Number | Seconds of consecutive loss before alert fires |
| `status` | Select | `running` / `stopped` |

**API rules:** only the record owner can create, read, update, or delete their own monitors.

### `ping_logs` — Ping results (real-time subscribed)

| Field | Type | Description |
|-------|------|-------------|
| `monitor` | Relation → monitors | The monitor that produced this log (cascade delete) |
| `latency_ms` | Number | Round-trip latency in milliseconds (`0` on loss) |
| `is_packet_loss` | Boolean | `true` if the ping timed out |
| `logged_at` | Autodate | Timestamp set automatically on creation |

---

## 🚀 Getting Started (Development)

### Prerequisites

- **Node.js** v18 or later — [nodejs.org](https://nodejs.org)
- **PocketBase** binary — Download the correct build for your OS from [pocketbase.io](https://pocketbase.io/docs/)

### 1. Clone the Repository

```bash
git clone https://github.com/hutrisemendawai/network360.git
cd network360
```

### 2. Start PocketBase

Place the `pocketbase` (or `pocketbase.exe` on Windows) binary inside the `pocketbase/` folder, then run:

```bash
cd pocketbase
./pocketbase serve
# Windows: .\pocketbase.exe serve
```

PocketBase will start at **http://127.0.0.1:8090**.

Open the admin UI at **http://127.0.0.1:8090/_/** and create your **superuser** account when prompted.

### 3. Create the Database Collections

With PocketBase still running, open a second terminal:

```bash
cd pocketbase
npm install
node setup.js <superuser-email> <superuser-password>
```

Expected output:
```
🔐 Authenticating as superuser...
✅ Authenticated!
📦 Creating "monitors" collection...
✅ "monitors" collection created!
📦 Creating "ping_logs" collection...
✅ "ping_logs" collection created!
🎉 Setup complete!
```

> **Note:** If you restart PocketBase and the `pb_data/` folder already exists, the collections persist — you do not need to run `setup.js` again.

### 4. Run the Frontend (Dev Server)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser. Register a new user account and you're in.

### 5. Run the Ping Worker

The worker must run as a Node.js process with **superuser** credentials so it can write to `ping_logs` on behalf of all users.

```bash
cd worker
npm install
node worker.js <superuser-email> <superuser-password>
```

The worker will:
1. Authenticate with PocketBase
2. Load all monitors with `status = "running"` and start pinging
3. Listen for real-time changes — automatically starts/stops/restarts monitors as you control them from the dashboard

---

## 🏭 Production Deployment

### Overview

In production you run **three processes** side by side:

| Process | Command | Default port |
|---------|---------|-------------|
| PocketBase | `./pocketbase serve` | `8090` |
| SvelteKit (Node) | `node build/index.js` | `3000` |
| Ping Worker | `node worker.js <email> <pass>` | — |

### Step 1 — Install a Node adapter for SvelteKit

The default `adapter-auto` works for many platforms. For a plain Linux/Windows server, switch to `@sveltejs/adapter-node`:

```bash
cd frontend
npm install -D @sveltejs/adapter-node
```

Update `svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-node';

const config = {
    kit: { adapter: adapter() }
};

export default config;
```

### Step 2 — Point the Frontend at Your PocketBase URL

Edit `frontend/src/lib/pb.js` and change the PocketBase URL from `http://127.0.0.1:8090` to your server's address (e.g. `https://pb.yourdomain.com`).

### Step 3 — Build the Frontend

```bash
cd frontend
npm run build
```

This outputs a production-ready Node.js server to `frontend/build/`.

### Step 4 — Start PocketBase

```bash
cd pocketbase
./pocketbase serve --http "0.0.0.0:8090"
```

Run `setup.js` once if this is a fresh deployment (see step 3 in Getting Started).

### Step 5 — Start the Frontend Server

```bash
cd frontend
node build/index.js
# Listens on http://0.0.0.0:3000 by default
# Override: PORT=8080 node build/index.js
```

### Step 6 — Start the Ping Worker

```bash
cd worker
node worker.js <superuser-email> <superuser-password>
```

### Running as Background Services (Linux — systemd)

Create a unit file for each process. Example for the worker (`/etc/systemd/system/network360-worker.service`):

```ini
[Unit]
Description=Network360 Ping Worker
After=network.target

[Service]
WorkingDirectory=/opt/network360/worker
ExecStart=/usr/bin/node worker.js admin@example.com yourpassword
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now network360-worker
```

Repeat for `network360-frontend` and let PocketBase manage itself (it ships as a single self-contained binary).

### Running with Docker (optional)

You can containerize each service independently. A minimal `Dockerfile` for the frontend:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/package.json .
EXPOSE 3000
CMD ["node", "build/index.js"]
```

---

## 🎨 UI Design

- **Dark theme** with `#0a0e1a` background
- **Glassmorphism cards** — backdrop blur + semi-transparent borders
- **Accent colors** — Cyan (`#06b6d4`) for healthy, Amber (`#f59e0b`) for spikes, Red (`#ef4444`) for down
- **Typography** — Google Fonts Inter for clean readability
- **Micro-animations** — Hover effects, fade-in transitions, pulse alerts
- **Responsive** — Adaptive grid layout for mobile, tablet, and desktop

---

## 📁 Project Structure

```
network360/
├── frontend/
│   ├── src/
│   │   ├── img/
│   │   │   ├── network360.ico           # Favicon
│   │   │   └── network360.png           # Navbar logo
│   │   ├── lib/
│   │   │   ├── components/
│   │   │   │   ├── AddMonitorModal.svelte   # Add/edit monitor form modal
│   │   │   │   ├── Footer.svelte            # Page footer
│   │   │   │   ├── LatencyChart.svelte      # Chart.js real-time latency chart
│   │   │   │   ├── MonitorCard.svelte       # Per-monitor card with animation
│   │   │   │   ├── Navbar.svelte            # Top navigation bar with logo
│   │   │   │   ├── PingAnimation.svelte     # GSAP packet travel animation
│   │   │   │   └── Toast.svelte             # Toast notification overlay
│   │   │   ├── stores/
│   │   │   │   ├── auth.js                  # Auth state + login/logout
│   │   │   │   ├── monitors.js              # Monitor CRUD + realtime SSE
│   │   │   │   └── toast.js                 # Toast notification store
│   │   │   └── pb.js                        # PocketBase client singleton
│   │   ├── routes/
│   │   │   ├── login/+page.svelte           # Login page
│   │   │   ├── register/+page.svelte        # Register page
│   │   │   ├── +layout.svelte               # Root layout + auth guard + favicon
│   │   │   └── +page.svelte                 # Main dashboard
│   │   ├── app.css                          # TailwindCSS v4 + custom CSS theme
│   │   └── app.html                         # HTML shell + Inter font preload
│   ├── svelte.config.js                     # SvelteKit adapter config
│   ├── vite.config.js                       # Vite + TailwindCSS plugin
│   └── package.json
├── worker/
│   ├── worker.js                            # ICMP ping engine (Node.js)
│   └── package.json
├── pocketbase/
│   ├── setup.js                             # One-time collection schema creation
│   ├── pb_migrations/                       # Auto-generated migration files
│   └── package.json
└── README.md
```

---

## 📄 License

MIT

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/hutrisemendawai">hutrisemendawai</a>
</p>
