# 🎵 Music Streaming App

A full-stack music streaming application built with React, Node.js/Express, and MySQL.

## 🚀 Features

✅ User Authentication (Signup/Login with JWT)  
✅ Browse & Search Songs  
✅ Music Player with Play/Pause Controls  
✅ Create & Manage Playlists  
✅ Like/Favorite Songs  
✅ User Profiles  

## 📋 Tech Stack

**Frontend:**
- React 18 + Vite
- Axios for API calls
- CSS3 for styling

**Backend:**
- Node.js + Express
- MySQL Database
- JWT Authentication
- bcryptjs for password hashing

## 🛠 Installation

### 1. Database Setup

Open MySQL and run:
```sql
source database/schema.sql
```

Or manually create the database and tables using [schema.sql](database/schema.sql)

### 2. Backend Setup

```bash
cd backend

# Copy environment variables
copy .env.example .env

# Install dependencies
npm install

# Start the server
npm run dev
```

Server runs at: `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

App runs at: `http://localhost:3000`

## 📚 API Endpoints

### Users
- `POST /api/users/signup` - Register new user
- `POST /api/users/login` - Login user
- `GET /api/users/profile` - Get user profile (requires auth)

### Music
- `GET /api/music/songs` - Get all songs
- `GET /api/music/search?query=term` - Search songs
- `GET /api/music/songs/:id` - Get song details
- `POST /api/music/like` - Like a song (requires auth)
- `GET /api/music/liked` - Get liked songs (requires auth)

### Playlists
- `POST /api/playlists/create` - Create playlist (requires auth)
- `GET /api/playlists` - Get user's playlists (requires auth)
- `POST /api/playlists/add-song` - Add song to playlist (requires auth)
- `GET /api/playlists/:playlistId/songs` - Get playlist songs

## 🔐 Authentication

The app uses JWT tokens for authentication. When you login/signup:
1. A JWT token is returned
2. Store it in localStorage
3. Include it in Authorization header: `Bearer <token>`

## 📁 Project Structure

```
Music-app/
├── backend/
│   ├── config/          (Database config)
│   ├── controllers/      (Business logic)
│   ├── models/          (Database models)
│   ├── middleware/      (Auth middleware)
│   ├── routes/          (API routes)
│   ├── server.js        (Main server file)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  (React components)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── database/
    └── schema.sql       (Database schema)
```

## 🚦 Getting Started

1. **Setup Database** - Run schema.sql in MySQL
2. **Start Backend** - Run `npm run dev` in backend folder
3. **Start Frontend** - Run `npm run dev` in frontend folder
4. **Access App** - Open http://localhost:3000

## 🎯 Next Steps

- [ ] Add offline mode support
- [ ] Implement recommendations engine
- [ ] Add social features (share playlists)
- [ ] Mobile app (React Native)
- [ ] CDN integration for songs
- [ ] Advanced search filters
- [ ] User follows/friends system

## 📝 Notes

- Default database: `music_app`
- Backend API base: `http://localhost:5000`
- Frontend development: `http://localhost:3000`
- Ensure MySQL is running before starting backend

## 💡 Tips

1. Change JWT_SECRET in `.env` for production
2. Use environment variables for sensitive data
3. Songs need `file_url` pointing to audio files
4. Test with sample songs in the database

---

Built with ❤️ for music lovers
