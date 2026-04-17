// Check full Jamendo API response
const axios = require('axios');

const testJamendo = async () => {
  try {
    console.log('Getting full response from Jamendo API...');
    
    const response = await axios.get('https://api.jamendo.com/v3.0/tracks', {
      params: {
        client_id: 'c9e41899',
        format: 'json',
        limit: 5,
        order: 'popularity_month',
        audioformat: 'mp3',
        imagesize: 200,
      },
      timeout: 10000,
    });

    console.log('Full Response:');
    console.log(JSON.stringify(response.data, null, 2).substring(0, 1000));
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testJamendo();
