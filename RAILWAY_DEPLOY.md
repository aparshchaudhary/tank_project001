# TURRET CBPM — Railway Deployment Guide

This guide walks you through deploying the **TURRET CBPM Platform** to [Railway](https://railway.app) in under 3 minutes.

---

## 🚀 Why This Project Deploys Seamlessly on Railway

1. **Unified Multi-Stage Container (`Dockerfile`)**:
   - Compiles the React + TypeScript frontend into optimized static assets.
   - Embeds the frontend into the FastAPI backend runner.
   - **One single Railway service** handles the Web UI, REST API (`/api/v1`), and WebSocket (`/ws/telemetry`) on the exact same port and domain — **zero CORS or SSL configuration needed**.
2. **Dynamic Port Binding**:
   - Automatically adapts to Railway's dynamic `$PORT` environment variable.
3. **Database Flexibility**:
   - **Default**: Self-contained SQLite database with WAL mode (zero setup needed).
   - **Production PostgreSQL / TimescaleDB**: Automatically detects and normalizes Railway's `DATABASE_URL` (`postgres://` → `postgresql://`).
4. **Zero-Downtime Healthcheck**:
   - Pre-configured Railway healthcheck at `/healthz`.

---

## Method 1: Deploy via GitHub (Recommended — 3 Steps)

### Step 1: Push This Folder to GitHub

Open a terminal (PowerShell or Git Bash) inside this folder:

```powershell
cd C:\Users\hp\OneDrive\Desktop\turret-cbpm

# Initialize Git
git init
git add .
git commit -m "Initial commit: Railway-ready TURRET CBPM platform"

# Create a new repository on GitHub (e.g. named 'turret-cbpm') and push:
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/turret-cbpm.git
git push -u origin main
```

*(Note: The `.gitignore` already ensures heavy folders like `venv` and `node_modules` are excluded, so the upload takes only seconds.)*

---

### Step 2: Deploy on Railway

1. Go to [railway.com](https://railway.com) (or [railway.app](https://railway.app)) and log in (or sign up with GitHub).
2. Click **+ New Project**.
3. Select **Deploy from GitHub repo**.
4. Choose your `turret-cbpm` repository.
5. Click **Deploy Now**.

Railway will automatically detect the `Dockerfile` and `railway.json`, build the React frontend, install Python dependencies, and launch the service!

---

### Step 3: Generate Public URL

1. In your Railway project dashboard, click on your deployed **turret-cbpm** service card.
2. Go to the **Settings** tab.
3. Under the **Networking** section, click **Generate Domain** (e.g., `turret-cbpm-production.up.railway.app`).
4. Click your domain link to open the live platform in your browser!

---

## (Optional) Add a PostgreSQL Database on Railway

If you want a dedicated managed database instead of SQLite:

1. Inside your Railway project canvas, click **+ New** (or press <kbd>Ctrl</kbd> + <kbd>K</kbd>).
2. Select **Database** → **Add PostgreSQL**.
3. Railway automatically links the database and injects the `DATABASE_URL` variable into your `turret-cbpm` web service.
4. The platform will automatically connect to PostgreSQL, initialize the 12 tables, and seed initial baseline signatures!

---

## Method 2: Deploy via Railway CLI (Zero GitHub Required)

If you have the [Railway CLI](https://docs.railway.com/guides/cli) installed:

```powershell
# 1. Navigate to the project directory
cd C:\Users\hp\OneDrive\Desktop\turret-cbpm

# 2. Login to your Railway account
railway login

# 3. Link or create project
railway init

# 4. Upload and deploy directly
railway up
```

Once the build finishes, run `railway domain` to view your live public URL!

---

## 🔐 Default Access Credentials

Once your Railway service is live, sign in with:

| Role | Username | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full control, user admin, re-baselining |
| **Technician** | `tech` | `tech123` | Acknowledge & resolve alerts, log maintenance |
| **Viewer** | `viewer` | `viewer123` | Read-only analytics & dashboards |

*(Clickable quick-fill buttons are provided on the login page.)*

---

## ⚙️ Environment Variables Reference (Optional)

Railway sets these automatically, but you can customize them in the **Variables** tab on Railway:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8000` | Injected dynamically by Railway |
| `DATABASE_URL` | `sqlite:///./turret_cbpm.db` | PostgreSQL connection string (auto-injected by Railway Postgres plugin) |
| `SECRET_KEY` | *(Pre-configured)* | JWT signing secret |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | JWT token validity window (24 hours) |
| `DEFAULT_K_SIGMA` | `3.0` | Default statistical deviation threshold ($\mu \pm k\sigma$) |
| `OUT_OF_ORDER_TOLERANCE_SECONDS` | `120.0` | Edge buffer out-of-order ingestion tolerance |

---

## 🛠️ Testing Locally Before Deploying

You can test the exact production build on your machine anytime:

- **One-click**: Double-click `start.bat` on your Desktop.
- **Docker**: Run `docker build -t turret-cbpm . && docker run -p 8000:8000 turret-cbpm`
