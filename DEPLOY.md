# Deploying SRI.CR In-App Mail on Render

One Render web service runs everything: the Express API **and** the built website (`dist/`). Because the site and the API share one
address, the login cookie works with no extra settings. The database stays on MongoDB Atlas.

| Piece | Where | Address |
|---|---|---|
| Website + API | Render web service | `https://<your-service>.onrender.com` |
| Database | MongoDB Atlas (already set up) | – |

## 0. Put the code on GitHub (once)

This folder is not a git repository yet. `.env` files and `node_modules` are already ignored, so your secrets are not uploaded.

```bash
git init
git add .
git status          # check that no .env file is listed
git commit -m "SRI.CR In-App Mail"
# create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/sricr-inapp-mail.git
git branch -M main
git push -u origin main
```

## 1. Database: allow Render to connect

Atlas → **Network Access → Add IP Address → Allow access from anywhere (0.0.0.0/0)**. Render's free servers do not have a fixed
IP address. The database password protects it, so keep it strong. (If you already did this for the appointment app on the same
Atlas project, there is nothing to do.)

## 2. Create the service on Render

**Option A: Blueprint (recommended).** render.com → **New → Blueprint** → pick the GitHub repo. It reads `render.yaml`.
Fill in the one value it asks for:

- `MONGODB_URI`: the same Atlas connection string as in `server/.env`

`JWT_SECRET` is generated for you. Do not reuse the development one.

**Option B: by hand** (render.com → **New → Web Service** → pick the repo):

| Setting | Value |
|---|---|
| Runtime | Node |
| Build Command | `npm install --include=dev && npm run build && npm --prefix server install --omit=dev` |
| Start Command | `npm --prefix server start` |
| Health Check Path | `/api/health` |

Environment variables:

| Key | Value |
|---|---|
| `NODE_VERSION` | `22` |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `1` |
| `JWT_SECRET` | a long random string (not the development one) |
| `MONGODB_URI` | your Atlas connection string |
| `MONGODB_DB` | `sricr_inapp_mail` |

## 3. Check it

Open `https://<your-service>.onrender.com/api/health`: it should show `{"status":"ok"}`. Then open the root address, sign up,
and sign in.

The sample colleagues and mail from `npm run seed` are for development. Do **not** run the seed against the live database.

**Free plan limits.** The service sleeps after 15 minutes without visits, and the first request afterwards takes about 30–60
seconds. A free monitor at uptimerobot.com that requests `/api/health` every 5 minutes keeps it awake. The paid Starter plan
(about $7 a month) removes the limit.

## Good to know

- **Attachments** are stored in MongoDB (5 MB each, up to 5 per mail), so they count towards your Atlas storage.
- **Updating the app:** push to GitHub; Render rebuilds and redeploys automatically.
- **Custom address:** Render → the service → **Settings → Custom Domains**, and add the DNS record it shows at your registrar.
  HTTPS is automatic.
- **Production cookies** are `HttpOnly`, `Secure` and `SameSite=Lax`, so the site only works over `https://` (Render provides it).
