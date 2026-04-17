// Quick test of Jamendo API integration
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/music/trending?limit=2',
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
    console.log(JSON.stringify(JSON.parse(data), null, 2));
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();
