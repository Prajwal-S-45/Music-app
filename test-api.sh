#!/bin/bash
# Quick API Testing Script
# After adding your Jamendo Client ID to .env and restarting the server

echo "🎵 Testing Music App API with Jamendo Integration"
echo "=================================================="
echo ""

# Test 1: Health Check
echo "✓ Test 1: Health Check"
curl -s http://localhost:5000/api/health | grep -q "Server is running" && echo "  Backend is running ✓" || echo "  Backend not responding ✗"
echo ""

# Test 2: Trending Songs (will work after Client ID is set)
echo "✓ Test 2: Trending Songs"
echo "  curl 'http://localhost:5000/api/music/trending?limit=3'"
echo ""

# Test 3: Search
echo "✓ Test 3: Search Songs"
echo "  curl 'http://localhost:5000/api/music/search?query=jazz&limit=5'"
echo ""

# Test 4: Get Song by ID
echo "✓ Test 4: Get Song Details"
echo "  curl 'http://localhost:5000/api/music/songs/12345678'"
echo ""

# Test 5: Signup
echo "✓ Test 5: User Signup"
echo "  curl -X POST http://localhost:5000/api/users/signup \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"user@test.com\",\"password\":\"pass123\",\"name\":\"Test User\"}'"
echo ""

# Test 6: Like a Song (after getting token from signup)
echo "✓ Test 6: Like a Song"
echo "  curl -X POST http://localhost:5000/api/music/like \\"
echo "    -H 'Authorization: Bearer TOKEN' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"songId\":\"12345678\"}'"
echo ""

echo "=================================================="
echo "📝 For full API documentation, see: API_REFERENCE.md"
echo "🚀 For setup instructions, see: JAMENDO_SETUP.md"
echo "📋 For integration details, see: JAMENDO_INTEGRATION.md"
