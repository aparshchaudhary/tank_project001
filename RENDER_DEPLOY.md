# TURRET CBPM — Render Deployment Guide

This guide explains how to deploy the **TURRET CBPM Platform** to [Render](https://render.com).

---

## ⚠️ The Root Cause of the Render Build Error

If Render showed:
```
ERROR: failed to solve: failed to compute cache key:
failed to calculate checksum ... "/frontend": not found
```

### Why it happened:
In the Render Web Service creation form, there is an optional field called **"Root Directory"**.
* If **"Root Directory"** was set to `backend` or `frontend`, Render restricts the build context to that subdirectory only.
* When Docker runs `COPY frontend/ ./`, the Docker build daemon cannot find `/frontend` because Render excluded everything outside the `backend` folder.

### The Fix:
1. Ensure **"Root Directory"** is **EMPTY / BLANK** in your Render Dashboard settings.
2. The project now includes a **`render.yaml`** Blueprint specification that explicitly sets `dockerContext: .` (the root of the repository).

---

## Method 1: Deploy with Render Blueprint (Recommended — 100% Automated)

Render Blueprints use the included `render.yaml` to configure everything automatically without manual settings:

1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** $\to$ **Blueprint**.
3. Connect your GitHub repository: `https://github.com/aparshchaudhary/tank_project001`.
4. Render will read `render.yaml`, set the build context to the repository root `.`, and deploy the Docker web service automatically.
5. Click **Apply**.

---

## Method 2: Manual Web Service Setup on Render

If you prefer to configure the Web Service manually:

1. Go to [dashboard.render.com](https://dashboard.render.com) $\to$ Click **New +** $\to$ **Web Service**.
2. Connect your GitHub repository: `aparshchaudhary/tank_project001`.
3. Fill in the fields:
   * **Name**: `turret-cbpm`
   * **Region**: Any (e.g. Oregon, Frankfurt)
   * **Branch**: `main`
   * **Root Directory**: ⚠️ **LEAVE THIS COMPLETELY BLANK!** (Do NOT type `backend` or `frontend`)
   * **Runtime**: `Docker`
   * **Instance Type**: `Free`
4. Under **Advanced**:
   * **Dockerfile Path**: `Dockerfile` (or `./Dockerfile`)
   * **Docker Build Context Directory**: `.` (or leave blank for root)
   * **Health Check Path**: `/healthz`
5. Click **Create Web Service**.

Render will now build both the React frontend and FastAPI backend inside the multi-stage Docker container and deploy your live URL.

---

## 🔐 Access Credentials

Once deployed, sign in with:

| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` |
| **Technician** | `tech` | `tech123` |
| **Viewer** | `viewer` | `viewer123` |
