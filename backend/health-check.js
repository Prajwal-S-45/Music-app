// Quick health check
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/health',
  method: 'GET',
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('✅ Backend is running');
      console.log('Status:', response.status);
    } catch {
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Backend not responding:', error.message);
});

req.end();
