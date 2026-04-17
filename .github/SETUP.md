<!-- Workspace customization for Music Streaming App -->

## Music Streaming App Setup Guide

### Quick Start

1. **Database Setup**
   - Open MySQL terminal
   - Run: `source database/schema.sql`

2. **Backend**
   ```bash
   cd backend
   copy .env.example .env
   npm install
   npm run dev
   ```

3. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access App**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

### Features Included

✅ Authentication (JWT)  
✅ Search & Browse Songs  
✅ Music Player  
✅ Playlists  
✅ Like/Favorite Songs  

### Project Structure

```
Music-app/
├── backend/          ← Node.js + Express API
├── frontend/         ← React + Vite UI
└── database/         ← MySQL Schema
```

### Key Files

- `backend/server.js` - Main backend entry
- `frontend/src/App.jsx` - Main React component
- `database/schema.sql` - Database initialization
- `README.md` - Full documentation

---

For detailed docs, see [README.md](../README.md)
