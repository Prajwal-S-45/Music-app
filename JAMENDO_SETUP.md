# Jamendo API Integration Guide

## Overview
This music app now uses the **Jamendo API** for streaming millions of Creative Commons licensed songs instead of local file uploads.

## Getting Your Jamendo API Key

### Step 1: Register for a Free Developer Account
1. Visit [Jamendo Developer Portal](https://developer.jamendo.com)
2. Click **Sign Up** (free tier available)
3. Fill in your email, password, and create an account
4. Verify your email address

### Step 2: Create an Application
1. Log in to your Jamendo Developer account
2. Go to **Applications** or **My Applications**
3. Click **Create New Application**
4. Fill in the application details:
   - **App Name**: "My Music App"
   - **Description**: "Music streaming application"
   - **Type**: Select "Web"
5. Accept terms and create the application
6. **Copy your Client ID** (you'll need this)

### Step 3: Add Client ID to Your Backend
1. Open `backend/.env`
2. Add or update this line:
   ```
   JAMENDO_CLIENT_ID=your_actual_client_id_here
   ```
   Replace `your_actual_client_id_here` with the Client ID from Step 2

### Step 4: Restart Backend
```bash
cd backend
node server.js
# or with nodemon for development
npx nodemon server.js
```

## Features Available with Jamendo API

### Songs
- ✅ Browse trending songs
- ✅ Search millions of tracks
- ✅ Filter by artist, album, genre
- ✅ Direct streaming from Jamendo CDN
- ✅ Album artwork & metadata
- ✅ Creative Commons licensing info

### User Interactions
- ✅ Like/favorite songs (stored in your database)
- ✅ Create playlists with Jamendo songs
- ✅ Sync playback with other users

### Real-Time Features
- ✅ Real-time listening rooms
- ✅ Multi-user sync playback
- ✅ Socket.IO integration

## API Endpoints

### Trending Songs
```bash
curl "http://localhost:5000/api/music/trending?limit=10"
```

### Search Songs
```bash
curl "http://localhost:5000/api/music/search?query=jazz&limit=20"
```

### Get Song Details
```bash
curl "http://localhost:5000/api/music/songs/12345678"
```

### Like a Song
```bash
curl -X POST http://localhost:5000/api/music/like \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"songId":"12345678"}'
```

## Rate Limits

Jamendo API has rate limits on the free tier:
- **Calls per minute**: ~3600 (60 per second average)
- **Daily limit**: Generous for development/small apps

For production apps with high traffic, consider:
1. Caching responses
2. Upgrading to a paid Jamendo plan
3. Implementing Redis cache layer

## Troubleshooting

### "Invalid Client Id Error"
- Make sure you've added your Client ID to `backend/.env`
- Verify the Client ID from Jamendo dashboard
- Restart the backend server after updating `.env`

### No Songs Returned
- Check your Jamendo account is active
- Try searching with a common term: `curl "http://localhost:5000/api/music/search?query=pop"`
- Check backend console for error messages

### Slow Responses
- Jamendo API can be slow sometimes
- Consider adding caching for frequently accessed data
- Check your internet connection

## Next Steps

### Optional: Setup Caching
Add Redis for faster responses:
```bash
npm install redis
```

### Optional: Production Deployment
1. Get a production Jamendo API key
2. Add to production environment variables
3. Implement response caching
4. Monitor rate limit usage

## Documentation Links

- [Jamendo API Docs](https://developer.jamendo.com/documentation)
- [Jamendo Portal](https://developer.jamendo.com)
- [Creative Commons Info](https://creativecommons.org/)

## License

Songs from Jamendo are Creative Commons licensed. Always check individual song licenses and provide proper attribution when needed.
