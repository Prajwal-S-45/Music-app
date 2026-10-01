const db = require('../config/database');
const CacheService = require('./CacheService');

const RECOMMENDATION_TTL_SECONDS = 15 * 60; // Cache for 15 minutes

async function getUserHistory(userId, limit = 50) {
  const [rows] = await db.query(
    `SELECT song_id, event_type, occurred_at
     FROM user_play_history
     WHERE user_id = ?
     ORDER BY occurred_at DESC
     LIMIT ?`,
    [userId, limit]
  );

  return rows;
}

async function getAllUserInteractions() {
  const cacheKey = 'recommendation:user_interactions';
  let interactions = await CacheService.get(cacheKey);

  if (!interactions) {
    const [rows] = await db.query(
      `SELECT user_id, song_id, event_type, occurred_at
       FROM user_play_history
       WHERE event_type IN ('play', 'like')
       ORDER BY occurred_at DESC`
    );

    // Build interaction matrix: user_id -> {song_id: weight}
    interactions = {};
    for (const row of rows) {
      if (!interactions[row.user_id]) {
        interactions[row.user_id] = {};
      }

      // Weight interactions: like = 3, play = 1
      const weight = row.event_type === 'like' ? 3 : 1;
      interactions[row.user_id][row.song_id] = (interactions[row.user_id][row.song_id] || 0) + weight;
    }

    await CacheService.set(cacheKey, interactions, RECOMMENDATION_TTL_SECONDS);
  }

  return interactions;
}

function cosineSimilarity(map1, map2) {
  // Calculate cosine similarity between two user interaction objects
  const keys1 = Object.keys(map1);
  const keys2 = Object.keys(map2);

  if (keys1.length === 0 || keys2.length === 0) {
    return 0;
  }

  // Find intersection of keys
  const intersection = new Set([...keys1].filter(k => map2.hasOwnProperty(k)));

  // Calculate dot product
  let dotProduct = 0;
  for (const key of intersection) {
    dotProduct += map1[key] * map2[key];
  }

  // Calculate magnitudes
  const magnitude1 = Math.sqrt(keys1.reduce((sum, val) => sum + (map1[val] * map1[val]), 0));
  const magnitude2 = Math.sqrt(keys2.reduce((sum, val) => sum + (map2[val] * map2[val]), 0));

  if (magnitude1 === 0 || magnitude2 === 0) return 0;

  return dotProduct / (magnitude1 * magnitude2);
}

function getUserSimilarUsers(userId, allInteractions) {
  const userInteractions = allInteractions[userId];
  if (!userInteractions) return [];

  const similarUsers = [];
  let totalSimilarity = 0;

  for (const [otherUserId, otherUserInteractions] of Object.entries(allInteractions)) {
    if (otherUserId === userId) continue;

    const similarity = cosineSimilarity(userInteractions, otherUserInteractions);

    if (similarity > 0.1) { // Minimum similarity threshold
      similarUsers.push({
        userId: otherUserId,
        similarity: similarity
      });
      totalSimilarity += similarity;
    }
  }

  // Normalize similarity scores
  if (totalSimilarity > 0) {
    return similarUsers.map(u => ({
      ...u,
      similarity: u.similarity / totalSimilarity
    }));
  }

  return [];
}

async function findSongsBySimilarUsers(userId, similarUsers, allInteractions) {
  const [userSongsRows] = await db.query(
    `SELECT song_id FROM user_play_history
     WHERE user_id = ? AND event_type IN ('play', 'like')`,
    [userId]
  );

  // Use Set for O(1) lookup
  const userSongs = new Set();
  for (const row of userSongsRows) {
    userSongs.add(row.song_id);
  }

  const recommendations = new Map(); // songId -> score

  for (const similarUser of similarUsers) {
    const similarUserInteractions = allInteractions[similarUser.userId];
    if (!similarUserInteractions) continue;

    for (const [songId, weight] of Object.entries(similarUserInteractions)) {
      if (!userSongs.has(songId)) {
        const currentScore = recommendations.get(songId) || 0;
        recommendations.set(songId, currentScore + (weight * similarUser.similarity));
      }
    }
  }

  // Convert to array and sort by score
  const recommendationsArray = Array.from(recommendations.entries()).map(([songId, score]) => ({
    id: songId,
    score: Math.min(score, 10) // Cap score at 10
  }));

  return recommendationsArray
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // Return top 10 recommendations
}

async function getUserSongMetadata(songs) {
  const songIds = songs.map(s => s.id);
  if (songIds.length === 0) return [];

  const placeholders = songIds.map(() => '?').join(', ');
  const [rows] = await db.query(
    `SELECT song_id, title, artist, album, thumbnail, duration, source
     FROM liked_songs
     WHERE song_id IN (${placeholders})
     ORDER BY liked_at DESC`,
    songIds
  );

  return rows.map(row => ({
    id: row.song_id,
    title: row.title,
    artist: row.artist,
    album: row.album,
    thumbnail: row.thumbnail,
    duration: row.duration,
    source: row.source
  }));
}

async function getContentBasedRecommendations(userId, limit = 10) {
  const cacheKey = `recommendation:content_based_${userId}`;
  let recommendations = await CacheService.get(cacheKey);

  if (!recommendations) {
    // Get user's interaction history
    const history = await getUserHistory(userId, 30);

    // Get songs user has liked (positive interactions)
    const likedSongs = history
      .filter(h => h.event_type === 'like')
      .map(h => h.song_id);

    if (likedSongs.length === 0) {
      return []; // No liked songs to base recommendations on
    }

    // Get metadata for liked songs
    const likedSongsMetadata = await getUserSongMetadata(likedSongs);

    // Find similar songs based on artist (content-based)
    const newRecommendations = [];

    for (const likedSong of likedSongsMetadata) {
      // Find songs by the same artist that the user hasn't interacted with
      const [similarByArtist] = await db.query(
        `SELECT DISTINCT ls.song_id, ls.title, ls.artist, ls.album, ls.thumbnail, ls.duration, ls.source
         FROM liked_songs ls
         WHERE ls.artist = ?
           AND ls.song_id NOT IN (
             SELECT song_id FROM user_play_history WHERE user_id = ?
           )
         ORDER BY ls.liked_at DESC
         LIMIT ?`,
        [likedSong.artist, userId, limit]
      );

      // Also find songs from the same album
      const [similarByAlbum] = await db.query(
        `SELECT DISTINCT ls.song_id, ls.title, ls.artist, ls.album, ls.thumbnail, ls.duration, ls.source
         FROM liked_songs ls
         WHERE ls.album = ?
           AND ls.album IS NOT NULL
           AND ls.song_id NOT IN (
             SELECT song_id FROM user_play_history WHERE user_id = ?
           )
         ORDER BY ls.liked_at DESC
         LIMIT ?`,
        [likedSong.album, userId, limit]
      );

      // Combine and deduplicate
      const seen = new Set();
      for (const song of [...similarByArtist, ...similarByAlbum]) {
        if (!seen.has(song.song_id)) {
          seen.add(song.song_id);
          newRecommendations.push(song);
        }
      }
    }

    // Limit results
    recommendations = newRecommendations.slice(0, limit);
    await CacheService.set(cacheKey, recommendations, RECOMMENDATION_TTL_SECONDS);
  }

  return recommendations;
}

async function generateRecommendations(userId, options = {}) {
  const cacheKey = `recommendation:generated_${userId}`;
  let recommendations = await CacheService.get(cacheKey);

  if (!recommendations) {
    const allInteractions = await getAllUserInteractions();
    const contentBasedRecommendations = await getContentBasedRecommendations(userId, options.limit || 10);

    if (allInteractions) {
      const similarUsers = getUserSimilarUsers(userId, allInteractions);

      // Check if we got enough similar users
      if (similarUsers.length > 0) {
        const collabRecommendations = await findSongsBySimilarUsers(userId, similarUsers, allInteractions);

        if (collabRecommendations && collabRecommendations.length > 0) {
          // Blend collaborative (70%) and content-based (30%) recommendations
          const weightedRecommendations = new Map();

          // Add collaborative recommendations with 70% weight
          for (const rec of collabRecommendations) {
            weightedRecommendations.set(rec.id, {
              ...rec,
              score: (rec.score || 1) * 0.7,
              source: 'collaborative'
            });
          }

          // Add content-based recommendations with 30% weight
          for (const rec of contentBasedRecommendations) {
            const existing = weightedRecommendations.get(rec.id);
            if (existing) {
              // Boost score if already in collaborative recommendations
              existing.score = existing.score + ((rec.score || 1) * 0.3);
              existing.source = 'hybrid';
            } else {
              // Add new content-based recommendation
              weightedRecommendations.set(rec.id, {
                ...rec,
                score: (rec.score || 1) * 0.3,
                source: 'content-based'
              });
            }
          }

          // Convert to array and sort by score
          recommendations = Array.from(weightedRecommendations.values())
            .map(rec => ({ ...rec, score: Math.min(rec.score, 10) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, options.limit || 10);
        }
      }
    }

    // If we don't have enough hybrid recommendations, use content-based or fallback to popular songs
    if (!recommendations || recommendations.length < 2) {
      if (contentBasedRecommendations && contentBasedRecommendations.length >= 2) {
        recommendations = contentBasedRecommendations.slice(0, options.limit || 10);
      } else {
        const popularService = require('./popularSongService');
        const popularSongs = await popularService.getTopSongs(
          options.fallbackLimit || 20,
          'global'
        );
        recommendations = popularSongs.map(song => ({
          ...song,
          score: 1.0,
          source: 'popular'
        }));
      }
    }

    await CacheService.set(cacheKey, recommendations, RECOMMENDATION_TTL_SECONDS);
  }

  return recommendations;
}

async function getRecommendedArtists(userId, limit = 10) {
  const cacheKey = `recommendation:artists_${userId}_${limit}`;
  let recommendations = await CacheService.get(cacheKey);

  if (!recommendations) {
    try {
      const [userArtistsRows] = await db.query(
        `SELECT artist, COUNT(*) as weight
         FROM liked_songs
         WHERE user_id = ? AND artist IS NOT NULL AND TRIM(artist) != ''
         GROUP BY artist
         ORDER BY weight DESC
         LIMIT 10`,
        [userId]
      );

      const topUserArtists = userArtistsRows.map(r => r.artist);
      const artistScores = new Map();

      const jioSaavnService = require('./JioSaavnService');

      for (const favArtist of topUserArtists) {
        try {
          const artistInfo = await jioSaavnService.searchArtist(favArtist);
          if (artistInfo?.id) {
            const details = await jioSaavnService.getArtistDetails(artistInfo.id);
            const similar = details?.biography?.similarArtists || [];
            similar.forEach(sa => {
              if (!topUserArtists.includes(sa.name)) {
                const key = sa.name.toLowerCase();
                const curr = artistScores.get(key) || { name: sa.name, image: sa.image, score: 0 };
                curr.score += 1;
                artistScores.set(key, curr);
              }
            });
          }
        } catch {
          // ignore single artist lookup error
        }
      }

      const candidates = Array.from(artistScores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      if (candidates.length > 0) {
        recommendations = candidates.map((c, idx) => ({
          id: `rec-artist-${idx}-${c.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: c.name,
          image: c.image || null,
          thumbnail: c.image || null,
          role: 'Artist',
          source: 'personalized_recommendation',
        }));
      } else {
        recommendations = [];
      }

      await CacheService.set(cacheKey, recommendations, RECOMMENDATION_TTL_SECONDS);
    } catch (err) {
      console.warn('getRecommendedArtists failed:', err.message);
      recommendations = [];
    }
  }

  return recommendations;
}

module.exports = {
  generateRecommendations,
  getRecommendedArtists,
  getUserHistory
};