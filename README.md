# emfuleni-docs-app
Custom app for managing invoices, quotations, delivery notes, and payments for Emfuleni Business Lines.

## Local Run

1. In `server/client`, run `npm install` if dependencies are missing.
2. In the project root, run `npm run build`.
3. In the project root, run `npm start`.
4. Open `http://localhost:5000`.

By default, the backend uses a local JSON data file at `server/data/documents.json`.

If `MONGODB_URI` is set, the app switches to MongoDB for shared persistent storage. On first startup with Mongo enabled, it will seed the database from the existing JSON file if one is present.

For production, use a MongoDB connection string in `MONGODB_URI`, for example `mongodb+srv://<db-user>:<db-password>@<cluster>/<database>?retryWrites=true&w=majority`. This server does not use MongoDB Data API public or private keys.

From the Atlas screen in your screenshot, choose `Drivers`, then `Node.js`, and copy the connection string. Replace `<db-password>` with your MongoDB database user's password before putting it into `MONGODB_URI`.

## Deployment Notes

- Build the frontend from `server/client` with `npm run build`.
- Deploy the `server` app as the Node service.
- For proper shared persistence, set `MONGODB_URI` in the deployed environment so the website stores data in MongoDB.
- The file-based `DATA_FILE` option is still available as a fallback for local development or emergency recovery.

## Render

This repo includes a Render Blueprint at [render.yaml](c:\Users\nkazi\emfuleni-docs-app\render.yaml).

Important:

- Render web services use an ephemeral filesystem by default, so file storage alone is not enough for reliable shared documents.
- The recommended setup is to set `MONGODB_URI` to a shared MongoDB database and let the app use Mongo-backed storage.
- The existing persistent disk config remains useful as a fallback and for one-time migration seeding from the old JSON file.

Deploy steps:

1. Push this repo to GitHub.
2. In Render, choose `New +` then `Blueprint`.
3. Connect the repo and let Render read `render.yaml`.
4. Add a `MONGODB_URI` environment value in Render before or after the first deploy.
5. Create the service and wait for the first deploy to finish.
6. Open the deployed URL and confirm `https://your-service.onrender.com/api/health` returns a healthy response.

The Blueprint config uses:

- `buildCommand`: installs backend and frontend dependencies, then builds the React app
- `startCommand`: starts the Node server from the repo root
- `healthCheckPath`: `/api/health`
- `REQUIRE_MONGO`: set to `true` in production so the app refuses to start without MongoDB
- `MONGODB_URI`: shared MongoDB backend connection string
- `DATA_FILE`: `/var/data/documents.json`
- persistent disk mount path: `/var/data`

Expected health check result after MongoDB is configured:

- `storage: "mongo"`
- `database: "connected"`
