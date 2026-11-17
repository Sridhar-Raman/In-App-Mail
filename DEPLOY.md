# Deploying SRI.CR In-App Mail (Vercel + Render + Atlas)

Same layout as the SRI.CR appointment app: the **website** on Vercel, the **API** on Render, the **database** on MongoDB Atlas.
Total cost: **$0**.

| Piece | Service | Address |
|---|---|---|
| Website (this repo's root: `src/`, `index.html`) | Vercel | `https://<your-site>.vercel.app` |
| API (`server/`) | Render | `https://<your-api>.onrender.com` |
| Database | MongoDB Atlas (you already have it) | – |

Login works like the appointment app: the API returns a token and the site sends it in an `Authorization: Bearer` header
(no cookies), so the two addresses can differ.

## 0. Code on GitHub

Done: `https://github.com/Sridhar-Raman/In-App-Mail`. After any change: `git add . && git commit -m "…" && git push`. Render and Vercel
redeploy on every push to `main`.

## 1. Database: allow the host to connect

Atlas → **Network Access → Add IP Address → Allow access from anywhere (0.0.0.0/0)**. Free hosts have changing IP addresses.
(If you already did this for the appointment app, there is nothing to do.)

## 2. API on Render

1. render.com → your project → **New → Web Service** (or **New → Blueprint**, which reads `render.yaml`) → pick `Sridhar-Raman/In-App-Mail`.
2. Settings (by hand):

| Setting | Value |
|---|---|
| Runtime | Node |
| **Root Directory** | `server` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Instance Type | Free |

3. Environment variables:

| Key | Value |
|---|---|
| `NODE_VERSION` | `22` |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `1` |
| `JWT_SECRET` | click **Generate**, or a long random string (not the development one) |
| `MONGODB_URI` | your Atlas connection string (paste it only into Render) |
| `MONGODB_DB` | `sricr_inapp_mail` |
| `CLIENT_ORIGIN` | the Vercel address from step 3, e.g. `https://sricr-mail.vercel.app` (you can set it after step 3 and redeploy) |

4. After the deploy, open `https://<your-api>.onrender.com/api/health`. It should say `{"status":"ok"}`.

**Free plan limits.** The service sleeps after 15 minutes without visits, and the first request afterwards takes about
30–60 seconds. A free monitor at uptimerobot.com that requests `/api/health` every 5 minutes keeps it awake. The paid
Starter plan (about $7 a month) removes the limit.

## 3. Website on Vercel

1. vercel.com → **Add New → Project** → import `Sridhar-Raman/In-App-Mail`.
2. **Root Directory:** leave as the repository root. Framework: Vite (detected). Build command `npm run build`, output `dist`
   (the defaults).
3. **Environment Variable:** `VITE_API_URL` = `https://<your-api>.onrender.com` (no trailing slash, no `/api`).
4. Deploy. If the address Vercel gives you differs from what you put in Render's `CLIENT_ORIGIN`, update it there and redeploy the API.

Pages like `/home` and `/login` work on refresh because `vercel.json` sends every path to the app.

`VITE_API_URL` is read when the site is **built**. If you change it, redeploy the site on Vercel.

## 4. Check it

Open the Vercel address → **Sign up** → **Log in** → the mailbox. If login says "Cannot reach the server", check that
`VITE_API_URL` is right and that `CLIENT_ORIGIN` on Render matches the Vercel address exactly (including `https://`, no trailing
slash). The first request after the API has been idle takes up to a minute.

Do **not** run `npm run seed` against the live database. The sample colleagues and mail are for development only.

## Good to know

- **Attachments** are stored in MongoDB (5 MB each, up to 5 per mail), so they count towards your Atlas storage.
- **Custom address:** Vercel → Project → **Settings → Domains**. Then add it to Render's `CLIENT_ORIGIN`, comma-separated
  (`https://sricr-mail.vercel.app,https://mail.sricr.com`).
- **Security note:** the login token is kept in the browser's storage (localStorage with "Keep me signed in", otherwise
  sessionStorage), the same as the appointment app. Tokens last 7 days (1 day without "Keep me signed in").
