# SRI.CR In-App Mail

React 19 + Vite front end (Landing, Login, Signup) with an Express + MongoDB API for accounts.

## Setup

1. Install MongoDB Community locally (or create a free MongoDB Atlas cluster and copy its connection string).
2. Install dependencies and configure the server:

```bash
npm run install:all
cp server/.env.example server/.env
```

3. Edit `server/.env`: set `MONGODB_URI` and a long random `JWT_SECRET`.
4. Run the API and the web app in two terminals:

```bash
npm run dev:server
```

```bash
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to the API on port 5000.

## API

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | `fullName, email, password` | 201 `{ user }` |
| POST | `/api/auth/login` | `email, password, remember?` | 200 `{ user }` + httpOnly cookie |
| POST | `/api/auth/logout` | – | clears cookie |
| GET | `/api/auth/me` | – | current `{ user }` or 401 |
| GET | `/api/health` | – | `{ status: 'ok' }` |

Passwords are hashed with bcrypt; the session is a 7-day JWT in an httpOnly cookie (a session cookie unless "Keep me signed in" is ticked).
Users are stored in the `users` collection (`fullName`, `email` unique, `passwordHash`, timestamps).

## In-App Mail

After signing in (`/home`): Inbox, Drafts, Sent, Starred, Trash with unread/draft badges; search (3+ characters), Newest/Oldest sort, 25-per-page paging;
select-all and bulk actions (trash, restore, delete permanently, star, mark read/unread); threaded conversations; Compose with To/Cc, subject, up to 5 attachments (5 MB each);
Reply, Reply all, Forward; save/continue drafts. `npm run seed` adds sample colleagues (`*@sricr.test`, password in `server/src/seed.js`) and sample mail.
Mail API: `/api/mail/*` (`server/src/routes/mail.js`), data in the `messages`, `mailboxes` and `attachments` collections.

## Deploy

See [DEPLOY.md](DEPLOY.md) — one Render web service serves the API and the built website (`render.yaml` is included).
