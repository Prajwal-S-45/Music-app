export const cleanSongTitle = (title) => {
  if (!title) return "";
  let clean = String(title).split('|')[0].trim();

  // Remove prefixes like "Official Video: ", "Lyric Video - ", etc.
  clean = clean.replace(/^(official video|official audio|official song|video|lyrical video|lyric video|audio|full song|full video)\s*[:-]\s*/gi, '');

  // Remove typical suffixes/parentheses
  clean = clean
    .replace(/\s*\([^)]*(official|video|audio|lyrical|lyrics|full song|song|4k|hd|feat\.?|ft\.?|t-series|t series|record|lyric)[^)]*\)/gi, '')
    .replace(/\s*\[[^\]]*(official|video|audio|lyrical|lyrics|full song|song|4k|hd|feat\.?|ft\.?|t-series|t series|record|lyric)[^\]]*\]/gi, '')
    .replace(/\s*-\s*(official|full video|full song|lyrical|lyrics|audio|video|t-series|t series|music video|lyric video).*$/gi, '')
    .trim();

  return clean;
};

export const getSongMetadata = (title, artist, description) => {
  if (!title) return { singer: artist || "Unknown Artist", music: null, lyricist: null, album: null };

  // Fallback (try to parse real-time details from uploader description)
  let realTimeDetails = null;
  if (description) {
    const cleanDesc = description.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    let parsedSinger = null;
    let parsedMusic = null;
    let parsedLyricist = null;

    // Look for Singer/Singers/Vocals
    const singerMatch = cleanDesc.match(/singers?\s*[:-]\s*([^\n|•|\(|\[]+)/i) ||
      cleanDesc.match(/vocals?\s*[:-]\s*([^\n|•|\(|\[]+)/i);
    if (singerMatch) parsedSinger = singerMatch[1].trim();

    // Look for Music/Composer/Music Director
    const musicMatch = cleanDesc.match(/music\s*director\s*[:-]\s*([^\n|•|\(|\[]+)/i) ||
      cleanDesc.match(/music\s*by\s*[:-]\s*([^\n|•|\(|\[]+)/i) ||
      cleanDesc.match(/composers?\s*[:-]\s*([^\n|•|\(|\[]+)/i) ||
      cleanDesc.match(/music\s*[:-]\s*([^\n|•|\(|\[]+)/i);
    if (musicMatch) parsedMusic = musicMatch[1].trim();

    // Look for Lyrics/Lyricist
    const lyricMatch = cleanDesc.match(/lyrics?\s*[:-]\s*([^\n|•|\(|\[]+)/i) ||
      cleanDesc.match(/lyricist\s*[:-]\s*([^\n|•|\(|\[]+)/i) ||
      cleanDesc.match(/lyrics\s*by\s*[:-]\s*([^\n|•|\(|\[]+)/i);
    if (lyricMatch) parsedLyricist = lyricMatch[1].trim();

    const cleanVal = (val) => {
      if (!val) return null;
      let cleaned = val.trim();
      cleaned = cleaned.replace(/^[:-]/, '').trim();
      cleaned = cleaned.replace(/[,;-]$/, '').trim();
      return cleaned.length > 2 && cleaned.length < 80 ? cleaned : null;
    };

    const cleanSinger = cleanVal(parsedSinger);
    const cleanMusic = cleanVal(parsedMusic);
    const cleanLyricist = cleanVal(parsedLyricist);

    if (cleanSinger || cleanMusic || cleanLyricist) {
      realTimeDetails = {
        singer: cleanSinger || artist || "Unknown Artist",
        music: cleanMusic || "Unknown Composer",
        lyricist: cleanLyricist || "Unknown Lyricist",
        album: null
      };
    }
  }

  if (realTimeDetails) return realTimeDetails;

  // Default fallback if uploader description has no credits listed
  return {
    singer: artist || "Unknown Artist",
    music: "Unknown Composer",
    lyricist: "Unknown Lyricist",
    album: null
  };
};

const FIRST_NAMES_REGEX = /\b(arijit|neha|jubin|asees|atif|sonu|rahat|alka|kumar|udit|king|honey|diljit|jasleen|stebin|armaan|amal|sachin|jigar|tanishk|arjun|mithoon|vishal|shekhar|amit|sidharth|kiara|ranbir|rashmika|nora|fatehi|john|abraham|riteish|deshmukh|shraddha|varun|dhawan|kriti|sanon|akshay|salman|khan|shah|rukh|srk|katrina|kaif|deepika|padukone|ranveer|singh|alia|bhatt|kartik|aaryan|vicky|kaushal|dulquer|salmaan|suraj|dhanya|siddharth|shreyas|irshad|vasuki|shakthisree|puneeth|darshan|yash|sudeep|kichcha|ganesh|rakshit|shiva|dhananjay|vijay|charan|sanjith|prashanth|ajaneesh|ananya|sanjay|raveena|rajesh|anuradha|pramod|reeshma|rohit|vijayprakash)\b/i;

const SURNAMES_REGEX = /\b(rajkumar|hegde|shetty|gowda|dixit|bhat|basrur|janya|neel|kiragandur|padaki|nanaiah|singh|kapoor|khan|bhatt|dutt|tandon|malhotra|advani|mandanna|fatehi|abraham|deshmukh|sanon|kaif|padukone|aaryan|kaushal|salmaan|mishra|kamil|puranik|kumaar|jaani|bpraak|garima|muntashir|vaibhav|gopalan|belmannu|chithra|manjula|krishnan|srinivas|kalyan|spb|balasubrahmanyam|anuradha|chithra|manjula|gururaj|uddith|narayanan|chaitanya|nautiyal|kaur|badshah|ghoshal|aslam|nigam|yagnik|sanu|narayan|royal|stebin|ben|mallik|bagchi|mithoon|pritam|shekhar|trivedi|rahman|pandey|sharma|verma|yadav|patel|gupta|joshi|das|roy|sen|rao|nayak|shastry|chari|murthy|prasad|ranjan|dubey|tiwari|tripathi|choudhury|banerjee|chatterjee|mukherjee)\b/i;

const isCreditsOrName = (text) => {
  const pLower = text.toLowerCase();

  // 1. Check for list characters
  if (pLower.includes(',') || pLower.includes('&') || /\b(and|feat\.?|ft\.?)\b/i.test(pLower)) {
    return true;
  }

  // 2. Check for first names or surnames
  if (FIRST_NAMES_REGEX.test(pLower) || SURNAMES_REGEX.test(pLower)) {
    return true;
  }

  return false;
};

export const extractMovieOrAlbum = (rawTitle, artist, trackAlbum, trackMovie, metaAlbum) => {
  if (metaAlbum) return metaAlbum;
  if (trackAlbum && trackAlbum !== "Single" && trackAlbum !== "Unknown Album") return trackAlbum;
  if (trackMovie && trackMovie !== "Single" && trackMovie !== "Unknown Movie") return trackMovie;

  if (!rawTitle) return "Single";

  // 1. Look for patterns like: From "Movie Name" or (From "Movie Name")
  const fromMatch = rawTitle.match(/from\s+["']([^"']+)["']/i) || rawTitle.match(/\(from\s+([^\)]+)\)/i);
  if (fromMatch && fromMatch[1]) {
    return fromMatch[1].trim();
  }

  const cleanSong = cleanSongTitle(rawTitle).toLowerCase();

  // 2. Check if the title is separated by - or : before any | (e.g. "Song - Movie")
  const mainSection = rawTitle.split('|')[0].trim();
  const subParts = mainSection.split(/[\-:]+/).map(p => p.trim()).filter(Boolean);
  if (subParts.length >= 2) {
    // Filter out parts containing singer/actor/director names
    const validParts = subParts.filter(p => !isCreditsOrName(p));

    if (validParts.length === 1) {
      return validParts[0];
    }

    if (validParts.length >= 2) {
      // Look for a part that contains video/song/audio keywords to identify it as the track title
      const songPartIdx = validParts.findIndex(p => /\b(song|video|audio|lyric|lyrics|singles|official|lyrical)\b/i.test(p.toLowerCase()));
      if (songPartIdx !== -1) {
        const movieIdx = songPartIdx === 0 ? 1 : 0;
        return validParts[movieIdx];
      }

      // Fallback: Bollywood standard JioSaavn titles typically use: "Song Title - Movie Name"
      // Return the second part as the movie name
      return validParts[1];
    }
  }

  // 3. Fallback: split by | if no - or : was present in the main section
  const parts = rawTitle.split('|').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const artistLower = String(artist || "").toLowerCase();

    const candidates = parts.filter(p => {
      const pLower = p.toLowerCase();
      return !pLower.includes(artistLower) &&
        !artistLower.includes(pLower) &&
        !pLower.includes(cleanSong) &&
        !cleanSong.includes(pLower) &&
        !isCreditsOrName(p) &&
        !/\b(official|video|audio|lyric|lyrics|full song|clip|t-series|sony|zeemusic|yrf|saregama|tips)\b/i.test(pLower);
    });
    if (candidates.length > 0) {
      return candidates[0];
    }
  }

  // 4. Fallback: Clean title itself
  return "Single";
};
