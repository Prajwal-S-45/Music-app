# 🎵 Music App - Complete API Reference

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

---

## 👤 User Endpoints

### 1. Signup
```
POST /users/signup
Content-Type: application/json

Body:
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

Response (201):
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### 2. Login
```
POST /users/login
Content-Type: application/json

Body:
{
  "email": "user@example.com",
  "password": "password123"
}

Response (200):
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### 3. Get Profile
```
GET /users/profile
Authorization: Bearer <token>

Response (200):
{
  "id": 1,
  "name": "John Doe",
  "email": "user@example.com"
}
```

---

## 🎵 Music Endpoints (Jamendo API)

### Overview
All music data is sourced from **Jamendo** - a platform with millions of Creative Commons licensed songs. Songs are free to stream with proper attribution.

### 1. Get Trending/All Songs
```
GET /music/songs?limit=50&offset=0

Query Parameters:
- limit (optional): Number of songs per page (default: 50, max: 200)
- offset (optional): Pagination offset (default: 0)

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "12345678",
      "title": "Song Title",
      "artist": "Artist Name",
      "album": "Album Name",
      "duration": 180,
      "image": "https://...",
      "file_url": "https://jamendo.com/download/...",
      "license": "Creative Commons",
      "loves": 1205,
      "source": "jamendo"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 50
  }
}
```

### 2. Get Trending Songs (Explicit Route)
```
GET /music/trending?limit=50&offset=0

Query Parameters:
- limit (optional): Number of songs (default: 50, max: 200)
- offset (optional): Pagination offset (default: 0)

Response (200):
{
  "success": true,
  "data": [...],
  "pagination": { "limit": 50, "offset": 0, "total": 50 }
}
```

### 3. Search Songs
```
GET /music/search?query=jazz&limit=50

Query Parameters:
- query (required): Search term
- limit (optional): Results per page (default: 50, max: 200)

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "87654321",
      "title": "Jazz Song",
      "artist": "Jazz Musician",
      "album": "Jazz Album",
      "duration": 300,
      "image": "https://...",
      "file_url": "https://jamendo.com/download/...",
      "license": "Creative Commons",
      "loves": 850,
      "source": "jamendo"
    }
  ],
  "query": "jazz",
  "total": 25
}
```

### 4. Get Song Details by ID
```
GET /music/songs/:id

Path Parameters:
- id (required): Jamendo song ID

Response (200):
{
  "success": true,
  "data": {
    "id": "12345678",
    "title": "Song Title",
    "artist": "Artist Name",
    "album": "Album Name",
    "album_id": "album123",
    "artist_id": "artist456",
    "duration": 180,
    "image": "https://...",
    "file_url": "https://jamendo.com/download/...",
    "license": "Creative Commons",
    "loves": 1205,
    "source": "jamendo"
  }
}
```

### 5. Get Songs by Artist
```
GET /music/artist/:artistId?limit=50

Path Parameters:
- artistId (required): Jamendo artist ID

Query Parameters:
- limit (optional): Results per page (default: 50, max: 200)

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "song1",
      "title": "Artist Song 1",
      "artist": "Artist Name",
      "album": "Album 1",
      "duration": 200,
      "image": "https://...",
      "file_url": "https://jamendo.com/download/...",
      "source": "jamendo"
    }
  ],
  "artistId": "artist456",
  "total": 12
}
```

### 6. Get Songs by Album
```
GET /music/album/:albumId

Path Parameters:
- albumId (required): Jamendo album ID

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "song1",
      "title": "Track 1",
      "artist": "Artist Name",
      "album": "Album Name",
      "duration": 180,
      "image": "https://...",
      "file_url": "https://jamendo.com/download/...",
      "source": "jamendo"
    }
  ],
  "albumId": "album123",
  "total": 10
}
```

### 7. Like a Song
```
POST /music/like
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "songId": "12345678"
}

Response (200):
{
  "success": true,
  "message": "Song liked successfully"
}
```

### 8. Unlike a Song
```
DELETE /music/like/:songId
Authorization: Bearer <token>

Path Parameters:
- songId (required): Song ID to unlike

Response (200):
{
  "success": true,
  "message": "Song unliked successfully"
}
```

### 9. Get User's Liked Songs
```
GET /music/liked
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "12345678",
      "title": "Liked Song",
      "artist": "Artist Name",
      "album": "Album Name",
      "duration": 180,
      "image": "https://...",
      "file_url": "https://jamendo.com/download/...",
      "source": "jamendo"
    }
  ],
  "total": 5
}
```

---

## 📋 Playlist Endpoints

### 1. Create Playlist
```
POST /playlists/create
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "name": "My Playlist",
  "description": "My favorite songs"
}

Response (201):
{
  "id": 1,
  "name": "My Playlist",
  "description": "My favorite songs"
}
```

### 2. Get User's Playlists
```
GET /playlists
Authorization: Bearer <token>

Response (200):
[
  {
    "id": 1,
    "user_id": 1,
    "name": "My Playlist",
    "description": "My favorite songs",
    "created_at": "2024-04-15T10:00:00Z"
  }
]
```

### 3. Add Song to Playlist
```
POST /playlists/add-song
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "playlistId": 1,
  "songId": 5
}

Response (200):
{
  "message": "Song added to playlist"
}
```

### 4. Get Playlist Songs
```
GET /playlists/:playlistId/songs

Response (200):
[
  {
    "id": 1,
    "title": "Song One",
    "artist": "Artist A",
    "album": "Album 1",
    "duration": 180,
    "file_url": "https://example.com/song.mp3"
  }
]
```

---

## Error Responses

### Common Error Format
```json
{
  "error": "Error message describing what went wrong"
}
```

### Status Codes
- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (not allowed)
- `404` - Not Found
- `500` - Server Error

### Example Errors

#### Missing Search Query
```
GET /music/search

Response (400):
{
  "error": "Search query is required"
}
```

#### Song Not Found
```
GET /music/songs/invalid-id

Response (404):
{
  "error": "Song not found"
}
```

#### Unauthorized (Missing Token)
```
GET /music/liked

Response (401):
{
  "error": "User not authenticated"
}
```

#### API Error
```
Response (500):
{
  "error": "Failed to fetch trending songs: Connection timeout"
}
```

---

## 📊 Database Schema

**Note**: Songs are no longer stored in the database. All music data comes from Jamendo API. Database only stores user-specific data.

### users
```sql
id (INT, PK)
email (VARCHAR, UNIQUE)
password (VARCHAR, hashed)
name (VARCHAR)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### liked_songs
```sql
id (INT, PK)
user_id (INT, FK)
song_id (VARCHAR, Jamendo song ID)
created_at (TIMESTAMP)
UNIQUE(user_id, song_id)
```

### playlists
```sql
id (INT, PK)
user_id (INT, FK)
name (VARCHAR)
description (TEXT)
created_at (TIMESTAMP)
```

### playlist_songs
```sql
id (INT, PK)
playlist_id (INT, FK)
song_id (VARCHAR, Jamendo song ID)
added_at (TIMESTAMP)
UNIQUE(playlist_id, song_id)
```

---

## 🧪 Testing with cURL

### Test Database Connection
```bash
curl http://localhost:5000/api/health
```

### Test Get Trending Songs
```bash
curl "http://localhost:5000/api/music/songs?limit=10"
```

### Test Get Trending (Explicit Route)
```bash
curl "http://localhost:5000/api/music/trending?limit=10"
```

### Test Search Songs
```bash
curl "http://localhost:5000/api/music/search?query=jazz&limit=20"
```

### Test Get Song by ID
```bash
curl "http://localhost:5000/api/music/songs/12345678"
```

### Test Get Songs by Artist
```bash
curl "http://localhost:5000/api/music/artist/artist456?limit=20"
```

### Test Get Songs by Album
```bash
curl "http://localhost:5000/api/music/album/album123"
```

### Test Signup
```bash
curl -X POST http://localhost:5000/api/users/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Like a Song (requires token)
```bash
curl -X POST http://localhost:5000/api/music/like \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"songId":"12345678"}'
```

### Test Unlike a Song (requires token)
```bash
curl -X DELETE http://localhost:5000/api/music/like/12345678 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Get Liked Songs (requires token)
```bash
curl http://localhost:5000/api/music/liked \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📝 Rate Limiting

Currently no rate limiting. For production, add:
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
```

---

## 🔒 Security Recommendations

1. **Use HTTPS** in production
2. **Hide sensitive data** in environment variables
3. **Validate all inputs** before database operations
4. **Use rate limiting** to prevent abuse
5. **Enable CORS** only for trusted domains
6. **Hash passwords** with bcrypt (✅ already done)
7. **Use JWT secret** that's strong and unique

---

## 📚 Frontend Integration

```javascript
// Example: Login and get token
const login = async (email, password) => {
  const response = await axios.post(
    'http://localhost:5000/api/users/login',
    { email, password }
  );
  const token = response.data.token;
  localStorage.setItem('token', token);
  
  // Use token for subsequent requests
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

// Example: Fetch songs
const getSongs = async () => {
  const response = await axios.get('http://localhost:5000/api/music/songs');
  return response.data;
};
```

---

Last Updated: April 15, 2026
