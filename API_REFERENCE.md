# Music App API Reference

## Base URL

http://localhost:5000/api

## Auth

Protected endpoints require:

Authorization: Bearer <jwt_token>

## User Endpoints

### POST /users/signup
Body:
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

### POST /users/login
Body:
{
  "email": "user@example.com",
  "password": "password123"
}

### GET /users/profile
Protected.

## YouTube Music Endpoints

### GET /search
Primary search endpoint.

Query params:
- q (required)
- limit (optional, default 12, max 25)

Response:
{
  "success": true,
  "source": "youtube",
  "query": "arijit singh",
  "total": 3,
  "data": [
    {
      "id": "VIDEO_ID",
      "videoId": "VIDEO_ID",
      "title": "Song title",
      "thumbnail": "https://...",
      "channelTitle": "Channel",
      "publishedAt": "2024-01-01T00:00:00Z",
      "source": "youtube",
      "playable": true
    }
  ]
}

### GET /trending
Primary trending endpoint.

Query params:
- limit (optional, default 12, max 25)

Notes:
- Uses YouTube mostPopular music category for region IN.
- Applies filtering to reduce covers/remixes/shorts noise.

### GET /music/search
Alias endpoint under music namespace.

Query params:
- query or q
- limit

### GET /music/trending
Alias endpoint under music namespace.

### GET /music/search/all
Backward-compatible alias that maps to YouTube search.

Query params:
- query or q
- limit

### GET /music/artwork
Artwork proxy with fallback SVG.

Query params:
- url (optional)

If url is invalid/unavailable, returns fallback artwork.

## Likes Endpoints

### POST /music/like
Protected.
Body:
{
  "songId": "VIDEO_ID"
}

### DELETE /music/like/:songId
Protected.

### GET /music/liked
Protected.
Returns liked songs with YouTube metadata when available.

## Playlist Endpoints

### POST /playlists/create
Protected.
Body:
{
  "name": "My Playlist",
  "description": "Optional"
}

### GET /playlists
Protected.

### POST /playlists/add-song
Protected.
Body:
{
  "playlistId": 1,
  "songId": "VIDEO_ID"
}

### DELETE /playlists/remove-song
Protected.
Body:
{
  "playlistId": 1,
  "songId": "VIDEO_ID"
}

### GET /playlists/:playlistId/songs
Protected.
Returns playlist songs resolved from YouTube metadata where possible.

## Health Endpoint

### GET /health
Response:
{
  "status": "Server is running",
  "youtubeConfigured": true
}

## Environment Variables (Backend)

Required:
- PORT
- DB_HOST
- DB_USER
- DB_PASSWORD
- DB_NAME
- JWT_SECRET
- YOUTUBE_API_KEY

Optional:
- FRONTEND_URL
- PORT_FALLBACK_ATTEMPTS
