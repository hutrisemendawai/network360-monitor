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

## ✨ Fitur Utama

### 🖥️ Dashboard Real-Time
- **Card-based monitoring** — Setiap target host ditampilkan dalam card interaktif dengan desain glassmorphism premium
- **Status indikator** — 🟢 Healthy, 🟡 Spike, 🔴 Down / Packet Loss terlihat langsung tanpa perlu klik
- **Stats overview** — Ringkasan jumlah monitor total, yang berjalan, dan yang berhenti

### 🎯 Animasi Perjalanan Ping (GSAP)
- Visual animasi paket data bergerak dari ikon **[PC]** ke **[Server]** melalui garis koneksi
- **Kecepatan animasi terikat ke latency** — latency rendah = cepat, latency tinggi = lambat
- **Packet loss** — paket berhenti di tengah, bergetar (shake effect), dan memudar menjadi merah

### 📊 Grafik Latency Dinamis (Chart.js)
- **Line chart real-time** menampilkan 50 ping terakhir
- **Moving Average (garis hijau)** — Rata-rata pergerakan dari seluruh data, update otomatis
- **Spike Threshold Band (area kuning)** — Area +20% di atas rata-rata sebagai indikator spike
- **Warna segmen dinamis** — Hijau (normal), kuning (spike), merah (packet loss)

### 🔔 Smart Alerting System
- **Consecutive loss tracking** — Menghitung packet loss berturut-turut per monitor
- **Card pulse animation** — Card berkedip merah terang saat jumlah packet loss melebihi threshold
- **Toast notifications** — Notifikasi muncul di layar dengan pesan detail saat alert terpicu
- **User-configurable threshold** — Setiap monitor bisa memiliki batas alert berbeda

### 🔐 Autentikasi
- Login & Register dengan email/password via PocketBase Auth
- Session management otomatis
- Auth guard — redirect ke login jika belum terautentikasi

### ⚙️ CRUD Monitor
- **Add Monitor** — Tambahkan target baru dengan nama, host (IP/domain), interval ping, dan threshold alert
- **Edit Monitor** — Update konfigurasi monitor kapan saja
- **Delete Monitor** — Hapus monitor yang tidak diperlukan
- **Start / Stop / Restart** — Kontrol status pingting langsung dari dashboard

---

## 🏗️ Arsitektur

```
Network360/
├── frontend/          ← SvelteKit + TailwindCSS v4 (UI Dashboard)
├── worker/            ← Node.js Ping Engine (ICMP Worker)
└── pocketbase/        ← PocketBase (Auth + DB + Realtime SSE)
```

### Tech Stack

| Komponen | Teknologi | Fungsi |
|----------|-----------|--------|
| **Frontend** | SvelteKit (Svelte 5) | SSR + Client-side routing, reactive UI |
| **Styling** | TailwindCSS v4 | Dark theme, glassmorphism, responsive layout |
| **Animasi** | GSAP | Animasi perjalanan paket ping |
| **Grafik** | Chart.js | Line chart real-time dengan moving avg & spike band |
| **Backend** | PocketBase | Auth, database (SQLite), real-time SSE subscriptions |
| **Worker** | Node.js + `ping` | ICMP ping engine yang menulis ke PocketBase |

### Data Flow

```
[User] → Dashboard (SvelteKit)
              │
              │  1. CRUD monitors via PocketBase API
              │  2. Subscribe to real-time SSE events
              ▼
         [PocketBase]  ←───── 3. Worker writes ping_logs
              │
              │  4. SSE broadcast ke semua subscribers
              ▼
         Dashboard updates:
         • Animasi GSAP bergerak
         • Chart.js menambah data point
         • Status indikator berubah
         • Alert terpicu jika threshold terlampaui
```

---

## 📦 Database Schema

### `monitors` — Konfigurasi target ping

| Field | Type | Deskripsi |
|-------|------|-----------|
| `user` | Relation → users | Pemilik monitor |
| `name` | Text | Nama monitor, misal "Server DB Utama" |
| `target_host` | Text | IP atau domain target (misal `1.1.1.1`) |
| `interval_ms` | Number | Jeda antar ping dalam milliseconds |
| `alert_threshold_sec` | Number | Batas waktu (detik) sebelum alert packet loss |
| `status` | Select | `running` / `stopped` |

### `ping_logs` — Hasil ping (real-time subscribed)

| Field | Type | Deskripsi |
|-------|------|-----------|
| `monitor` | Relation → monitors | Monitor yang menghasilkan log ini |
| `latency_ms` | Number | Latency dalam milliseconds |
| `is_packet_loss` | Boolean | `true` jika ping timeout |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **PocketBase** — Download dari [pocketbase.io](https://pocketbase.io/docs/) untuk OS Anda

### 1. Clone Repository

```bash
git clone https://github.com/hutrisemendawai/network360.git
cd network360
```

### 2. Setup PocketBase

```bash
# Taruh pocketbase.exe di folder pocketbase/
cd pocketbase

# Jalankan PocketBase pertama kali
./pocketbase serve

# Buka http://127.0.0.1:8090/_/ di browser
# Buat akun superuser
```

### 3. Buat Collections

```bash
# Masih di folder pocketbase/
node setup.js <superuser-email> <superuser-password>
```

Output yang diharapkan:
```
🔐 Authenticating as superuser...
✅ Authenticated!
📦 Creating "monitors" collection...
✅ "monitors" collection created!
📦 Creating "ping_logs" collection...
✅ "ping_logs" collection created!
🎉 Setup complete!
```

### 4. Jalankan Frontend

```bash
cd frontend
npm install
npm run dev
```

Buka **http://localhost:5173** di browser.

### 5. Jalankan Ping Worker

```bash
# Di terminal terpisah
cd worker
npm install
node worker.js <superuser-email> <superuser-password>
```

Worker akan mulai mem-ping semua monitor yang berstatus `running`.

---

## 🎨 Desain UI

- **Dark theme** dengan background `#0a0e1a`
- **Glassmorphism cards** — backdrop blur + semi-transparent borders
- **Accent colors** — Cyan (`#06b6d4`) untuk healthy, Amber (`#f59e0b`) untuk spike, Red (`#ef4444`) untuk down
- **Typography** — Google Fonts Inter untuk keterbacaan optimal
- **Micro-animations** — Hover effects, fade-in transitions, pulse alerts
- **Responsive** — Grid layout yang adaptif untuk mobile, tablet, dan desktop

---

## 📁 Struktur Folder

```
network360/
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/
│   │   │   │   ├── AddMonitorModal.svelte   # Form tambah/edit monitor
│   │   │   │   ├── Footer.svelte            # Footer dengan credit
│   │   │   │   ├── LatencyChart.svelte       # Chart.js real-time chart
│   │   │   │   ├── MonitorCard.svelte        # Card utama per monitor
│   │   │   │   ├── Navbar.svelte             # Navigation bar
│   │   │   │   ├── PingAnimation.svelte      # Animasi GSAP ping
│   │   │   │   └── Toast.svelte              # Toast notifications
│   │   │   ├── stores/
│   │   │   │   ├── auth.js                   # Auth state management
│   │   │   │   ├── monitors.js               # Monitor CRUD + realtime
│   │   │   │   └── toast.js                  # Toast notification store
│   │   │   └── pb.js                         # PocketBase client instance
│   │   ├── routes/
│   │   │   ├── login/+page.svelte            # Halaman login
│   │   │   ├── register/+page.svelte         # Halaman register
│   │   │   ├── +layout.svelte                # Root layout + auth guard
│   │   │   └── +page.svelte                  # Dashboard utama
│   │   ├── app.css                           # TailwindCSS v4 + custom theme
│   │   └── app.html                          # HTML template + Inter font
│   ├── svelte.config.js
│   ├── vite.config.js
│   └── package.json
├── worker/
│   ├── worker.js                             # Ping engine (Node.js)
│   └── package.json
├── pocketbase/
│   ├── setup.js                              # Schema creation script
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
