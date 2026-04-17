// Test Jamendo API directly
const axios = require('axios');

const testJamendo = async () => {
  try {
    console.log('Testing Jamendo API directly...');
    
    const response = await axios.get('https://api.jamendo.com/v3.0/tracks', {
      params: {
        client_id: 'c9e41899',
        format: 'json',
        limit: 3,
        order: 'popularity_month',
        audioformat: 'mp3',
      },
      timeout: 10000,
    });

    console.log('Jamendo API Status:', response.status);
    console.log('Response length:', response.data.results ? response.data.results.length : 'No results');
    
    if (response.data.results && response.data.results.length > 0) {
      console.log('\nFirst song:');
      const song = response.data.results[0];
      console.log({
        id: song.id,
        name: song.name,
        artist_name: song.artist_name,
        duration: song.duration,
        audio: song.audio ? 'Yes' : 'No',
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
};

testJamendo();
