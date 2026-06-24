# Deployment Guide

## Prerequisites

1. **Neon PostgreSQL** (free at https://neon.tech)
   - Create a project, copy the connection string
   - Set `DATABASE_URL` in your environment

2. **Google OAuth** (for Google sign-in, optional)
   - Go to https://console.cloud.google.com → APIs & Services → Credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URI: `https://your-domain.vercel.app/api/auth/callback/google`
   - Copy Client ID and Secret

3. **Generate AUTH_SECRET**
   ```
   openssl rand -base64 32
   ```

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to https://vercel.com → Import your repository
3. Set these environment variables in Vercel:
   - `DATABASE_URL` — your Neon connection string
   - `AUTH_SECRET` — generated random string
   - `AUTH_GOOGLE_ID` — from Google Console (optional)
   - `AUTH_GOOGLE_SECRET` — from Google Console (optional)
   - `NEXTAUTH_URL` — your Vercel deployment URL (e.g. https://your-app.vercel.app)
4. Deploy!

## Run migrations

After setting DATABASE_URL, run once:
```
npx prisma migrate deploy
```

Or locally during development:
```
npx prisma migrate dev
```
