// Test search endpoint
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/music/search?query=jazz&limit=3',
  method: 'GET',
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Response:');
    const parsed = JSON.parse(data);
    console.log(JSON.stringify(parsed, null, 2));
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();
