<p align="center">
  <img src="https://img.shields.io/badge/Network360-Real--Time%20Monitor-06b6d4?style=for-the-badge&logo=globe&logoColor=white" alt="Network360"/>
</p>

<h1 align="center">🌐 Network360</h1>

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

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | SvelteKit (Svelte 5) | SSR + client-side routing, reactive UI |
| **Styling** | TailwindCSS v4 | Dark theme, glassmorphism, responsive layout |
| **Animation** | GSAP | Ping packet travel animation |
| **Charts** | Chart.js | Real-time line chart with moving avg & spike band |
| **Backend** | PocketBase | Auth, SQLite database, real-time SSE subscriptions |
| **Worker** | Node.js + `ping` | ICMP ping engine that writes results to PocketBase |

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
| `user` | Relation → users | Owner of the monitor |
| `name` | Text | Monitor label, e.g. "Main DB Server" |
| `target_host` | Text | IP or domain (e.g. `1.1.1.1`) |
| `interval_ms` | Number | Ping interval in milliseconds |
| `alert_threshold_sec` | Number | Seconds of consecutive loss before alert fires |
| `status` | Select | `running` / `stopped` |

### `ping_logs` — Ping results (real-time subscribed)

| Field | Type | Description |
|-------|------|-------------|
| `monitor` | Relation → monitors | The monitor that produced this log |
| `latency_ms` | Number | Latency in milliseconds |
| `is_packet_loss` | Boolean | `true` if ping timed out |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **PocketBase** — Download from [pocketbase.io](https://pocketbase.io/docs/) for your OS

### 1. Clone the Repository

```bash
git clone https://github.com/hutrisemendawai/network360.git
cd network360
```

### 2. Set Up PocketBase

```bash
# Place pocketbase.exe in the pocketbase/ folder
cd pocketbase

# Start PocketBase
./pocketbase serve

# Open http://127.0.0.1:8090/_/ in your browser
# Create a superuser account
```

### 3. Create Collections

```bash
# Still in the pocketbase/ folder
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

### 4. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### 5. Run the Ping Worker

```bash
# In a separate terminal
cd worker
npm install
node worker.js <superuser-email> <superuser-password>
```

The worker will start pinging all monitors with status `running`.

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
│   │   ├── lib/
│   │   │   ├── components/
│   │   │   │   ├── AddMonitorModal.svelte   # Add/edit monitor form
│   │   │   │   ├── Footer.svelte            # Footer with credit
│   │   │   │   ├── LatencyChart.svelte      # Chart.js real-time chart
│   │   │   │   ├── MonitorCard.svelte       # Main card per monitor
│   │   │   │   ├── Navbar.svelte            # Navigation bar
│   │   │   │   ├── PingAnimation.svelte     # GSAP ping animation
│   │   │   │   └── Toast.svelte             # Toast notifications
│   │   │   ├── stores/
│   │   │   │   ├── auth.js                  # Auth state management
│   │   │   │   ├── monitors.js              # Monitor CRUD + realtime
│   │   │   │   └── toast.js                 # Toast notification store
│   │   │   └── pb.js                        # PocketBase client instance
│   │   ├── routes/
│   │   │   ├── login/+page.svelte           # Login page
│   │   │   ├── register/+page.svelte        # Register page
│   │   │   ├── +layout.svelte               # Root layout + auth guard
│   │   │   └── +page.svelte                 # Main dashboard
│   │   ├── app.css                          # TailwindCSS v4 + custom theme
│   │   └── app.html                         # HTML template + Inter font
│   ├── svelte.config.js
│   ├── vite.config.js
│   └── package.json
├── worker/
│   ├── worker.js                            # Ping engine (Node.js)
│   └── package.json
├── pocketbase/
│   ├── setup.js                             # Schema creation script
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
