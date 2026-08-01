# 🖥️ Company Desktop Agent (Windows)

> A production-ready, modular, and secure **Windows Desktop Agent** built with **Electron + Node.js**. It runs silently in the system tray, monitors employee presence & system idle time, manages break status, and synchronizes status with the company MERN management backend.

---

## 📋 Table of Contents

- [Overview & Purpose](#-overview--purpose)
- [Privacy & Security Guarantees](#-privacy--security-guarantees)
- [Project Architecture](#-project-architecture)
- [How Electron Works (Architecture & IPC)](#-how-electron-works-architecture--ipc)
- [System Requirements & Prerequisites](#-system-requirements--prerequisites)
- [Getting Started in Development](#-getting-started-in-development)
- [Device Pairing Flow](#-device-pairing-flow)
- [Heartbeat & Idle Monitoring](#-heartbeat--idle-monitoring)
- [Auto Updates Workflow](#-auto-updates-workflow)
- [Packaging & Building Installers (.exe & .msi)](#-packaging--building-installers-exe--msi)
- [MERN Backend Integration](#-mern-backend-integration)
- [Troubleshooting & Logs](#-troubleshooting--logs)

---

## 🎯 Overview & Purpose

The **Company Desktop Agent** is designed to work alongside the existing company web management portal. It is **not** a duplicate web application; it is a lightweight, background Windows system tray application responsible for:

- **System Activity & Idle Detection**: Automatically detects when an employee is active or idle (default threshold: 15 minutes).
- **Presence & Break Management**: Tracks Active, Idle, On Break, and Offline states.
- **Secure Device Pairing**: Links the desktop device to an employee account via a temporary web token or deep link (`desktop-agent://`).
- **Windows Boot Auto-Launch**: Starts silently in the background when Windows boots up (`app.setLoginItemSettings`).
- **Single Instance Enforcement**: Prevents duplicate running instances (`app.requestSingleInstanceLock`).
- **Automatic Silent Updates**: Periodically checks and downloads updates silently using `electron-updater`.
- **Offline Queueing**: Buffers heartbeat updates locally if the internet connection is lost and syncs once reconnected.

---

## 🛡️ Privacy & Security Guarantees

> [!IMPORTANT]
> The desktop agent is designed with strict employee privacy in mind:
> - ❌ **NO Keystroke Logging**: Does not record keypresses or text typed.
> - ❌ **NO Screenshots**: Does not capture screens or window contents.
> - ❌ **NO Personal File Monitoring**: Does not scan or read personal user files.
> - ✅ **Native OS Idle Time**: Uses Windows native `powerMonitor.getSystemIdleTime()` solely to check elapsed seconds since last mouse/keyboard input.

Security highlights:
- All sensitive tokens are encrypted on disk using Electron's `safeStorage` API (DPAPI on Windows).
- All communications are routed via HTTPS with certificate validation options.

---

## 📁 Project Architecture

The project follows clean architecture principles with clear separation of concerns:

```
desktop-agent/
├── assets/                  # Tray icons (active, idle, break, offline) & app installer icon
├── src/
│   ├── main/                # Electron Main process lifecycle & window management
│   │   ├── main.js          # App boot, single instance lock, auto-launch, protocol handling
│   │   └── preload.js       # Secure ContextBridge IPC interface for Renderer UI
│   ├── tray/                # System Tray manager
│   │   └── trayManager.js   # Tray icon, tooltips, dynamic context menus
│   ├── auth/                # Authentication & Device Pairing
│   │   └── authManager.js   # Pairing token exchange, device token lifecycle, protocol handler
│   ├── idle/                # Activity & Idle Detection Engine
│   │   └── idleDetector.js  # powerMonitor watcher, 15-min idle rule, break state management
│   ├── heartbeat/           # Heartbeat Service
│   │   └── heartbeatService.js # 30s interval loop, offline payload queueing, retry logic
│   ├── updater/             # Auto Updater Service
│   │   └── autoUpdater.js   # electron-updater integration, silent download, install prompt
│   ├── api/                 # Backend API Communication
│   │   ├── apiClient.js     # Axios client with device token headers & retry interceptors
│   │   └── agentApi.js      # API calls (/pair, /heartbeat, /status, /logout)
│   ├── config/              # Central Configuration
│   │   └── index.js         # Environment parser (.env loader & fallback defaults)
│   ├── logger/              # Structured Logging & File Rotation
│   │   └── logger.js        # electron-log setup, file rotation (5MB max)
│   ├── utils/               # Utility modules
│   │   ├── machineInfo.js   # Hostname, OS info, stable hardware device ID generator
│   │   ├── storage.js       # Encrypted storage wrapper (safeStorage / AES-256)
│   │   └── notifier.js      # Windows Desktop Notification manager
│   └── ui/                  # Settings / Pairing UI (Renderer)
│       ├── settings.html    # Modern dark-themed UI layout
│       ├── settings.js      # Renderer script interacting with IPC bridge
│       └── settings.css     # Clean CSS token styling
├── .env.example             # Configuration template
├── .env                     # Local environment settings
├── electron-builder.yml     # Electron Builder packaging configuration (.exe & .msi)
├── package.json             # NPM dependencies & scripts
└── README.md                # Documentation
```

---

## ⚡ How Electron Works (Architecture & IPC)

Since this is the team's first Electron application, here is how the core Electron concepts fit together:

### 1. Main Process vs. Renderer Process
- **Main Process (`src/main/main.js`)**: Runs in a Node.js environment. Has full access to native OS APIs (system tray, file system, `powerMonitor`, auto-updater, registry). It manages the app lifecycle and creates BrowserWindow instances.
- **Renderer Process (`src/ui/settings.js`)**: Runs the web page interface (Settings window). For security, Node.js integration is disabled in the renderer.

### 2. Secure Context Bridge (`src/main/preload.js`)
Communication between the Renderer and Main process happens safely via Electron's `contextBridge`:

```js
// preload.js (Exposes safe functions under window.electronAPI)
contextBridge.exposeInMainWorld("electronAPI", {
  getAgentStatus: () => ipcRenderer.invoke("agent:get-status"),
  pairDevice: (token) => ipcRenderer.invoke("agent:pair", token),
  toggleBreak: (onBreak) => ipcRenderer.invoke("agent:toggle-break", onBreak),
  forceSync: () => ipcRenderer.invoke("agent:force-sync"),
});
```

### 3. System Tray Lifecycle
The application starts silently in the system tray (`openAsHidden: true`). When the Settings window is closed by the user, it is **hidden** rather than destroyed (`event.preventDefault(); mainWindow.hide()`), ensuring presence monitoring runs uninterrupted.

---

## 💻 System Requirements & Prerequisites

- **OS**: Windows 10 / 11 (x64)
- **Node.js**: v18.0.0 or higher
- **NPM**: v9.0.0 or higher

---

## 🚀 Getting Started in Development

### 1. Install Dependencies

In the `desktop-agent` directory, run:

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```env
API_BASE_URL=http://localhost:5000/api/agent
UPDATE_URL=https://updates.company.com/desktop-agent
ENVIRONMENT=development
HEARTBEAT_INTERVAL=30
IDLE_TIMEOUT=900
REJECT_UNAUTHORIZED_CERTS=false
LOG_LEVEL=info
```

### 3. Start MERN Backend

Ensure your MERN backend server is running:

```bash
cd ../backend
npm run dev
# Running on http://localhost:5000
```

### 4. Run Agent in Development Mode

```bash
cd ../desktop-agent
npm run dev
```

The desktop agent will start, initialize the system tray icon, and launch the Settings window for pairing if not yet paired.

---

## 🔗 Device Pairing Flow

Device pairing securely links a physical desktop computer with an employee account:

```
[Employee on Web App] ---> Click "Pair Device" ---> Web generates temporary pairing token (e.g. PAIR-A1B2C3D4)
                                                                 |
                                                                 v
[Desktop Agent] <--- Deep Link (desktop-agent://pair?token=...) or Manual Input in Settings UI
        |
        +---> POST /api/agent/pair (pairingToken + deviceId + computerName + os)
        |
[MERN Backend] ---> Validates token ---> Generates long-lived Device Token (DEV-xxx...)
        |
[Desktop Agent] <--- Encrypts & Stores Device Token in safeStorage
        |
        v
Future requests include header: X-Device-Token: DEV-xxx...
```

---

## ⏱️ Heartbeat & Idle Monitoring

### 1. Idle Detection Rules
- Checks OS idle duration every 5 seconds using `powerMonitor.getSystemIdleTime()`.
- If idle time $\ge 15$ minutes (900s), status changes to `Idle`.
- When user moves mouse or presses a key, status returns to `Active` immediately.
- If user selects **"I'm On Break"** from the tray menu, status changes to `On Break` (overrides system idle timer until user clicks **"Resume Work"**).

### 2. Heartbeat Sync Service
- Every 30 seconds, sends a payload:

```json
{
  "deviceId": "AGENT-DEV-A1B2C3D4E5F6",
  "employeeId": "EMP-1002",
  "status": "Active",
  "idleTime": 42,
  "agentVersion": "1.0.0",
  "computerName": "WORKSTATION-01",
  "os": "Windows_NT 10.0.22631 (x64)",
  "timestamp": "2026-08-01T12:00:00.000Z"
}
```

### 3. Offline Buffering & Queueing
If the backend is unreachable or internet connection drops:
1. Agent enters `Offline` state.
2. Notifications alert the employee.
3. Heartbeats are queued in memory.
4. When internet returns, queue is automatically flushed and synchronized.

---

## 🔄 Auto Updates Workflow

Auto-updates use `electron-updater`:

1. On startup & periodically, checks `UPDATE_URL`.
2. When a newer version is published, it downloads silently in the background.
3. Once downloaded, triggers a desktop notification: *"Update Ready to Install"*.
4. On app exit or manual restart click, installs update seamlessly.

---

## 📦 Packaging & Building Installers (.exe & .msi)

Packaging is configured using **Electron Builder** in `electron-builder.yml`.

### 1. Build Executable Package (Directory)
```bash
npm run package
```
Generates unpacked application in `dist/win-unpacked`.

### 2. Generate Windows Installers (.exe & .msi)
```bash
npm run build
# OR
npm run make:installer
```
Generates:
- **`dist/Company Desktop Agent Setup 1.0.0.exe`** (NSIS Custom Installer with Desktop & Start Menu shortcuts)
- **`dist/Company Desktop Agent 1.0.0.msi`** (Enterprise MSI package)

### Code Signing (Production Release)
To sign installers with a digital certificate, update `electron-builder.yml` or set environment variables:

```yaml
win:
  certificateFile: path/to/certificate.pfx
  certificatePassword: env.CSC_KEY_PASSWORD
```

---

## 🔌 MERN Backend Integration

The MERN backend incorporates the agent API router in `backend/app.js`:

### Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/agent/generate-token` | Web App generates temporary pairing token |
| `POST` | `/api/agent/pair` | Exchanges pairing token for permanent device token |
| `POST` | `/api/agent/heartbeat` | Receives 30s status, idle time & presence payload |
| `POST` | `/api/agent/status` | Updates manual break/active status |
| `POST` | `/api/agent/logout` | Revokes device token & unpairs session |

---

## 📝 Troubleshooting & Logs

Log files are stored automatically by `electron-log` with file size rotation (5MB max):

- **Windows Log Location**:
  `%APPDATA%\company-desktop-agent\logs\main.log`

Log entries include formatted timestamps and category tags (`[PAIRING]`, `[HEARTBEAT]`, `[IDLE]`, `[BREAK]`, `[AUTH]`).
