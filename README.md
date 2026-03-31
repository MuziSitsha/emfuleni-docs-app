# emfuleni-docs-app
Custom app for managing invoices, quotations, delivery notes, and payments for Emfuleni Business Lines.

## Local Run

1. In `server/client`, run `npm install` if dependencies are missing.
2. In the project root, run `npm run build`.
3. In the project root, run `npm start`.
4. Open `http://localhost:5000`.

The backend now uses a local JSON data file at `server/data/documents.json`, so no API key or MongoDB connection is required to run it.

## Deployment Notes

- Build the frontend from `server/client` with `npm run build`.
- Deploy the `server` app as the Node service.
- Make sure the deployed environment allows writes to the data file location if you want document changes to persist.

## Render

This repo includes a Render Blueprint at [render.yaml](c:\Users\nkazi\emfuleni-docs-app\render.yaml).

Important:

- Render web services use an ephemeral filesystem by default, so this app needs a persistent disk to keep invoices, quotations, and delivery notes after restarts.
- Render persistent disks are available on paid web services, so use at least the `starter` plan for this setup.

Deploy steps:

1. Push this repo to GitHub.
2. In Render, choose `New +` then `Blueprint`.
3. Connect the repo and let Render read `render.yaml`.
4. Create the service and wait for the first deploy to finish.
5. Open the deployed URL and confirm `https://your-service.onrender.com/api/health` returns a healthy response.

The Blueprint config uses:

- `buildCommand`: installs backend and frontend dependencies, then builds the React app
- `startCommand`: starts the Node server from the repo root
- `healthCheckPath`: `/api/health`
- `DATA_FILE`: `/var/data/documents.json`
- persistent disk mount path: `/var/data`
