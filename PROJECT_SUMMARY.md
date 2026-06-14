# Music App Project Summary

## Overview

Music App is a full-stack music streaming web application. It combines a React/Vite frontend with a Node.js/Express backend, MySQL persistence, YouTube-powered music discovery, and Socket.IO real-time shared listening rooms.

The main user flow is:

1. Register or log in.
2. Search or browse music.
3. Play tracks and manage the queue.
4. Like songs and create playlists.
5. Join shared listening rooms for synchronized playback.

## Current Status

The project includes the core application layers needed for local development:

- Frontend application with routed pages and reusable music UI components
- Backend REST API for users, music, playlists, likes, and rooms
- Socket.IO server for real-time listening room sync
- MySQL schema for users, songs, playlists, likes, and listening rooms
- YouTube Data API integration for search, trending music, artwork, and metadata
- Local setup documentation in `README.md`
- API details in `API_REFERENCE.md`

## Key Features

| Area | Implemented |
| --- | --- |
| Authentication | Signup, login, JWT token handling, profile endpoint |
| Music Discovery | YouTube search, trending music, artist/cache endpoints |
| Playback | Player UI, queue support, external stream/player components |
| Likes | Like, unlike, and list liked songs |
| Playlists | Create playlists, add songs, remove songs, list playlist songs |
| Shared Rooms | Create/join rooms, sync play/pause/seek/song changes |
| Database | MySQL schema with relational tables and sample local songs |
| Artwork | Backend artwork proxy with fallback image |

## Architecture

```text
Frontend React app
  |
  | HTTP requests with Axios
  | Socket.IO client events
  v
Backend Express app
  |
  | REST routes
  | Socket.IO room events
  v
Controllers and services
  |
  | MySQL queries
  | YouTube Data API requests
  v
MySQL database and YouTube API
```

## Frontend Summary

Location: `frontend/`

Main technologies:

- React 18
- Vite
- React Router
- Axios
- Socket.IO client
- Framer Motion
- CSS stylesheets

Important files and folders:

- `frontend/src/main.jsx` - React entry point
- `frontend/src/App.jsx` - top-level app state and layout wiring
- `frontend/src/routes/AppRoutes.jsx` - route definitions
- `frontend/src/api/client.js` - Axios API client with auth token and local fallback handling
- `frontend/src/realtime/socketClient.js` - Socket.IO client setup
- `frontend/src/hooks/useSocketRoom.js` - shared listening room hook
- `frontend/src/pages/` - route-level pages
- `frontend/src/components/` - player, search, queue, playlist, layout, and auth components
- `frontend/src/styles/` - CSS and layout documentation

Frontend runs on:

```text
http://localhost:3000
```

## Backend Summary

Location: `backend/`

Main technologies:

- Node.js
- Express
- Socket.IO
- MySQL 2
- JWT
- bcryptjs
- Axios
- dotenv

Important files and folders:

- `backend/server.js` - Express app, Socket.IO setup, route mounting, startup logic
- `backend/config/database.js` - MySQL connection pool
- `backend/routes/` - API route definitions
- `backend/controllers/` - API request logic
- `backend/models/` - database model helpers
- `backend/middleware/auth.js` - JWT authentication middleware
- `backend/services/youtubeService.js` - YouTube API integration
- `backend/services/roomStore.js` - in-memory room state
- `backend/services/schemaMigrations.js` - startup schema compatibility checks
- `backend/.env.example` - environment variable template

Backend runs on:

```text
http://localhost:5000
```

If port `5000` is busy, the backend can try fallback ports based on `PORT_FALLBACK_ATTEMPTS`.

## Database Summary

Location: `database/schema.sql`

Default database name:

```text
music_app
```

Main tables:

- `users`
- `songs`
- `playlists`
- `playlist_songs`
- `liked_songs`
- `listening_rooms`
- `listening_room_members`

The schema includes a few sample local songs. YouTube-powered search and trending results require `YOUTUBE_API_KEY` in `backend/.env`.

## API Summary

Base URL:

```text
http://localhost:5000/api
```

Main route groups:

- `/users` - signup, login, profile
- `/search`, `/trending`, `/artists`, `/cache/stats` - YouTube-backed discovery endpoints
- `/music` - music namespace routes, likes, artwork, local songs
- `/playlists` - playlist CRUD-style operations
- `/rooms` - shared listening room REST operations
- `/health` - backend health check

See `API_REFERENCE.md` for request/response examples.

## Future Development

Planned or possible improvements for the next versions:

- AI-based music recommendations based on liked songs, playlist history, recently played tracks, and search behavior
- Personalized home page sections such as "Because you liked this artist", "More like this playlist", and "Recommended for your mood"
- Smart playlist generation from prompts, genres, artists, languages, or listening activity
- Similar-song discovery using track metadata, artist overlap, genre tags, tempo, and YouTube metadata
- Collaborative filtering so users with similar listening patterns can receive better recommendations
- Mood-based recommendations for workout, focus, travel, relaxing, party, and late-night listening
- AI-assisted search that understands natural language queries such as "sad Hindi songs from the 2010s" or "upbeat songs like this"
- Automatic playlist descriptions, titles, and cover suggestions
- Listening analytics dashboard for top artists, favorite genres, replayed songs, and weekly listening trends
- Recommendation feedback controls such as "show more like this", "not interested", and "hide this artist"
- Better caching for YouTube metadata and recommendation results to reduce API calls
- Admin dashboard for monitoring users, API usage, popular songs, and system health
- Deployment setup with production database, environment management, HTTPS, logging, and rate limiting

### AI Recommendation Approach

A practical recommendation system can be added in stages:

1. Start with rule-based recommendations using liked songs, playlists, and recently played tracks.
2. Add content-based recommendations using song title, artist, channel, tags, and YouTube metadata.
3. Store user interaction events such as play, like, skip, search, playlist add, and repeat count.
4. Build recommendation endpoints in the backend, for example `/api/recommendations`.
5. Add frontend sections for personalized recommendations on the home, search, and library pages.
6. Later, introduce embeddings or machine learning models for deeper similarity matching.

Possible new database tables:

- `play_history` - stores played songs and timestamps
- `user_music_events` - stores likes, skips, searches, playlist adds, and repeats
- `recommendation_cache` - stores generated recommendations for faster loading
- `song_metadata` - stores enriched metadata used for ranking and similarity

## Environment Variables

Backend environment file:

```text
backend/.env
```

Required or commonly used values:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=music_app
JWT_SECRET=change_this_to_a_secure_secret
ADMIN_EMAILS=admin@example.com
NODE_ENV=development
YOUTUBE_API_KEY=your_youtube_data_api_key_here
```

Optional values:

- `FRONTEND_URL` - allowed frontend origins
- `PORT_FALLBACK_ATTEMPTS` - number of backend fallback ports to try

Frontend environment file, only needed when overriding defaults:

```text
frontend/.env
```

```env
VITE_API_URL=http://localhost:5000
VITE_API_FALLBACK_URL=http://localhost:5001
```

## Running Locally

1. Create the MySQL database:

```sql
source database/schema.sql;
```

2. Start the backend:

```bash
cd backend
npm install
npm run dev
```

3. Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

4. Open the app:

```text
http://localhost:3000
```

## Documentation Map

- `README.md` - main setup and usage guide
- `PROJECT_SUMMARY.md` - high-level architecture and status summary
- `API_REFERENCE.md` - endpoint details and example payloads
- `database/schema.sql` - database schema
- `START.bat` - Windows quick-start notes
- `start.sh` - Linux/macOS quick-start script

## Production Notes

Before using this app outside local development:

- Replace `JWT_SECRET` with a strong secret.
- Do not commit real `.env` files or API keys.
- Use HTTPS.
- Configure production CORS origins with `FRONTEND_URL`.
- Add rate limiting and request logging.
- Use a managed database or production MySQL instance.
- Review YouTube API quota limits.
