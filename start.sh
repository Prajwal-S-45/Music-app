#!/bin/bash
# Music App Quick Start

echo "🎵 Music Streaming App - Quick Start"
echo "===================================="
echo ""

# Check if MySQL is running
echo "1️⃣  Setting up Database..."
echo "Make sure MySQL is running, then run:"
echo "   MySQL shell: source database/schema.sql"
echo ""

# Start Backend
echo "2️⃣  Starting Backend Server..."
cd backend
npm run dev &
BACKEND_PID=$!
echo "Backend running on http://localhost:5000"
echo ""

# Start Frontend
echo "3️⃣  Starting Frontend (this will open in your browser)..."
cd ../frontend
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
