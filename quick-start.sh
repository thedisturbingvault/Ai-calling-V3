#!/bin/bash

# AI Calling V3 - Quick Production Start
# Simple, reliable startup script

echo "🚀 Starting AI Calling V3..."

# Kill any existing processes
pkill -f "tw2gem\|vite\|serve\|http.server" 2>/dev/null || true
sleep 2

# Start TW2GEM Server
echo "🔧 Starting TW2GEM Server..."
cd /workspace/Ai-calling-V3
nohup node tw2gem-server-runner.js > tw2gem.log 2>&1 &
echo "TW2GEM PID: $!"

# Wait a moment
sleep 3

# Start Dashboard on port 8080 (reliable port)
echo "🎨 Starting Dashboard on port 8080..."
cd /workspace/Ai-calling-V3/dashboard/dist
nohup python3 -m http.server 8080 --bind 0.0.0.0 > ../dashboard.log 2>&1 &
echo "Dashboard PID: $!"

# Wait for services
sleep 5

# Test services
echo ""
echo "🔍 Testing services..."

if curl -s http://localhost:12001 >/dev/null 2>&1; then
    echo "✅ TW2GEM Server: http://localhost:12001"
else
    echo "❌ TW2GEM Server: FAILED"
fi

if curl -s http://localhost:8080 >/dev/null 2>&1; then
    echo "✅ Dashboard: http://localhost:8080"
else
    echo "❌ Dashboard: FAILED"
fi

echo ""
echo "🌐 External URLs:"
echo "   TW2GEM: https://work-2-kzgzbusfqxqopdna.prod-runtime.all-hands.dev"
echo "   Dashboard: http://localhost:8080"
echo ""
echo "✅ System ready!"