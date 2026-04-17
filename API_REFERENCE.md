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

## 🎵 Music Endpoints

### 1. Get All Songs
```
GET /music/songs?limit=50&offset=0

Query Parameters:
- limit (optional): Number of songs (default: 50)
- offset (optional): Pagination offset (default: 0)

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

### 2. Search Songs
```
GET /music/search?query=song_name

Query Parameters:
- query (required): Search term

Response (200):
[
  {
    "id": 1,
    "title": "Song Title",
    "artist": "Artist Name",
    "album": "Album Name",
    "duration": 180,
    "file_url": "https://example.com/song.mp3"
  }
]
```

### 3. Get Song Details
```
GET /music/songs/:id

Response (200):
{
  "id": 1,
  "title": "Song One",
  "artist": "Artist A",
  "album": "Album 1",
  "duration": 180,
  "file_url": "https://example.com/song.mp3"
}
```

### 4. Like a Song
```
POST /music/like
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "songId": 1
}

Response (200):
{
  "message": "Song liked"
}
```

### 5. Get Liked Songs
```
GET /music/liked
Authorization: Bearer <token>

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

### 400 - Bad Request
```json
{
  "error": "All fields required"
}
```

### 401 - Unauthorized
```json
{
  "error": "Invalid credentials"
}
```

### 404 - Not Found
```json
{
  "error": "Song not found"
}
```

### 500 - Server Error
```json
{
  "error": "Database connection failed"
}
```

---

## 📊 Database Schema

### users
```sql
id (INT, PK)
email (VARCHAR, UNIQUE)
password (VARCHAR, hashed)
name (VARCHAR)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### songs
```sql
id (INT, PK)
title (VARCHAR)
artist (VARCHAR)
album (VARCHAR)
duration (INT)
file_url (VARCHAR)
created_at (TIMESTAMP)
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
song_id (INT, FK)
added_at (TIMESTAMP)
UNIQUE(playlist_id, song_id)
```

### liked_songs
```sql
id (INT, PK)
user_id (INT, FK)
song_id (INT, FK)
liked_at (TIMESTAMP)
UNIQUE(user_id, song_id)
```

---

## 🧪 Testing with cURL

### Test Database Connection
```bash
curl http://localhost:5000/api/health
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

### Test Get Songs
```bash
curl http://localhost:5000/api/music/songs
```

### Test Search
```bash
curl "http://localhost:5000/api/music/search?query=artist"
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
