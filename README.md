# Music App

A full-stack music streaming web app built with React, Vite, Node.js, Express, Socket.IO, and MySQL.

The app lets users sign up, search JioSaavn-powered music results, play tracks, like songs, manage playlists, and join shared listening rooms with real-time playback sync.

## Features

- User signup, login, and JWT-based authentication
- JioSaavn music search and trending music endpoints
- Music player with queue support
- Liked songs library
- Playlist creation and song management
- Shared listening rooms using Socket.IO
- MySQL-backed users, playlists, liked songs, and room tables
- Artwork proxy with fallback image for missing or blocked thumbnails

## Tech Stack

**Frontend**

- React 18
- Vite
- React Router
- Axios
- Socket.IO client
- Framer Motion
- CSS modules/stylesheets

**Backend**

- Node.js
- Express
- MySQL 2
- Socket.IO
- JWT authentication
- bcryptjs password hashing
- JioSaavn unofficial API integration

**Database**

- MySQL
- Schema file: `database/schema.sql`

## Project Structure

```text
Music-app/
|-- backend/
|   |-- config/              # MySQL connection
|   |-- controllers/         # Request handlers
|   |-- middleware/          # Auth/admin middleware
|   |-- models/              # Database access helpers
|   |-- routes/              # Express route definitions
|   |-- services/            # JioSaavn, room store, schema migration logic
|   |-- uploads/             # Local uploaded/static files
|   |-- server.js            # Express and Socket.IO entry point
|   |-- .env.example         # Backend environment template
|   `-- package.json
|-- frontend/
|   |-- src/
|   |   |-- api/             # Axios client
|   |   |-- components/      # Reusable UI components
|   |   |-- hooks/           # React hooks
|   |   |-- pages/           # Route-level pages
|   |   |-- realtime/        # Socket client
|   |   |-- routes/          # App routes
|   |   |-- styles/          # CSS files and layout notes
|   |   |-- App.jsx
|   |   `-- main.jsx
|   |-- index.html
|   |-- vite.config.js
|   `-- package.json
|-- database/
|   `-- schema.sql           # Database schema and sample songs
|-- API_REFERENCE.md         # More detailed API notes
|-- START.bat                # Windows setup helper notes
|-- start.sh                 # Linux/macOS startup helper
`-- README.md
```

## Prerequisites

Install these before running the project:

- Node.js 18 or newer
- npm
- MySQL server
- JioSaavn unofficial API access

## Setup

### 1. Clone or Open the Project

```bash
cd Music-app
```

### 2. Create the Database

Start MySQL, then run the schema file from the project root:

```sql
source database/schema.sql;
```

The schema creates the `music_app` database, required tables, and a few sample songs.

### 3. Configure the Backend

```bash
cd backend
npm install
copy .env.example .env
```

On macOS/Linux, use:

```bash
cp .env.example .env
```

Update `backend/.env` with your local values:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=music_app
JWT_SECRET=change_this_to_a_secure_secret
ADMIN_EMAILS=admin@example.com
NODE_ENV=development
# No external API key is required; playback uses the JioSaavn unofficial API
```

Optional backend variables:

- `FRONTEND_URL` - comma-separated allowed frontend origins. Defaults to `http://localhost:5173,http://localhost:3000`.
- `PORT_FALLBACK_ATTEMPTS` - number of ports to try if `PORT` is already busy. Defaults to `5`.

### 4. Configure the Frontend

```bash
cd ../frontend
npm install
```

The frontend uses `http://localhost:5000` as the default API URL. If your backend runs somewhere else, create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_API_FALLBACK_URL=http://localhost:5001
```

## Running the App

Open two terminals.

Terminal 1, backend:

```bash
cd backend
npm run dev
```

Backend URL:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

Terminal 2, frontend:

```bash
cd frontend
npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

## Main API Routes

Base URL:

```text
http://localhost:5000/api
```

### Auth

- `POST /users/signup` - create a user account
- `POST /users/login` - login and receive a JWT token
- `GET /users/profile` - get the logged-in user profile

### Music and JioSaavn

- `GET /search?q=term` - search JioSaavn music
- `GET /trending` - get trending music
- `GET /artists` - get artist data
- `GET /cache/stats` - get backend cache stats
- `GET /music/search?query=term` - music namespace search alias
- `GET /music/trending` - music namespace trending alias
- `GET /music/search/all?query=term` - backward-compatible search alias
- `GET /music/songs` - get local songs
- `GET /music/artwork?url=<encoded-url>` - fetch artwork or fallback image
- `POST /music/like` - like a song
- `DELETE /music/like/:songId` - unlike a song
- `GET /music/liked` - get liked songs

### Playlists

- `POST /playlists/create` - create a playlist
- `GET /playlists` - get the current user's playlists
- `POST /playlists/add-song` - add a song to a playlist
- `DELETE /playlists/remove-song` - remove a song from a playlist
- `GET /playlists/:playlistId/songs` - get songs in a playlist

### Rooms

- `POST /rooms/create` - create a shared listening room
- `POST /rooms/join` - join a room
- `GET /rooms/:roomId` - get room state
- `PUT /rooms/:roomId/state` - update room playback state

For request/response examples, see `API_REFERENCE.md`.

## Real-Time Listening Rooms

The backend runs Socket.IO on the same server as Express. The frontend socket client connects to the backend and supports room events such as:

- create room
- join room
- leave room
- play
- pause
- seek
- change song
- periodic room sync

Room state is handled in `backend/services/roomStore.js`, and frontend room logic is in `frontend/src/hooks/useSocketRoom.js`.

## Authentication Flow

1. A user signs up or logs in.
2. The backend returns a JWT token.
3. The frontend stores the token in `localStorage`.
4. Axios automatically sends `Authorization: Bearer <token>` for protected endpoints.

Protected routes include profile, likes, and playlists.

## Useful Commands

Backend:

```bash
cd backend
npm run dev      # start with nodemon
npm start        # start with node
node health-check.js
```

Frontend:

```bash
cd frontend
npm run dev      # start Vite dev server on port 3000
npm run build    # production build
npm run preview  # preview production build
```

## Troubleshooting

**Backend cannot connect to MySQL**

- Make sure MySQL is running.
- Confirm `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in `backend/.env`.
- Run `database/schema.sql` before starting the backend.

**Search or trending endpoints fail**

- Make sure `YOUTUBE_API_KEY` is set in `backend/.env`.
- Confirm the key has access to JioSaavn Data API v3.

**Frontend cannot reach backend**

- Check `http://localhost:5000/api/health`.
- Make sure `VITE_API_URL` matches the backend URL if you changed the backend port.
- If port `5000` is busy, the backend may start on a fallback port such as `5001`.

**Port already in use**

- Backend starts at `PORT` from `.env` and can try fallback ports.
- Frontend is configured in `frontend/vite.config.js` to use port `3000`.

## Notes

- Do not commit real `.env` secrets.
- Change `JWT_SECRET` before using the app outside local development.
- The app stores JioSaavn video IDs as song IDs for external music results.
- `database/schema.sql` includes sample local songs, but JioSaavn search requires an API key.
