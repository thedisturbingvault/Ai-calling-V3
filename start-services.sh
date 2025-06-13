#!/bin/bash

# AI Calling V3 - Service Startup Script
# This script ensures clean startup of all services without port conflicts

echo "🚀 Starting AI Calling V3 Services..."

# Function to check if port is in use
check_port() {
    local port=$1
    if curl -s http://localhost:$port/health >/dev/null 2>&1 || curl -s http://localhost:$port >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    echo "🔍 Checking port $port..."
    
    # Find and kill processes using the port
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ ! -z "$pids" ]; then
        echo "⚠️  Killing processes on port $port: $pids"
        for pid in $pids; do
            if [ "$pid" != "" ] && [ "$pid" != "-" ]; then
                kill -9 $pid 2>/dev/null || true
            fi
        done
        sleep 2
    else
        echo "✅ Port $port is free"
    fi
}

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."

# Kill any vite processes
pkill -f "vite" 2>/dev/null || true
pkill -f "node.*vite" 2>/dev/null || true

# Kill processes on our target ports
kill_port 12000
kill_port 12001

# Wait a moment for cleanup
sleep 3

# Verify ports are free
echo "🔍 Verifying ports are available..."
if check_port 12000; then
    echo "❌ Port 12000 still in use, forcing cleanup..."
    kill_port 12000
    sleep 2
fi

if check_port 12001; then
    echo "❌ Port 12001 still in use, forcing cleanup..."
    kill_port 12001
    sleep 2
fi

# Change to project directory
cd /workspace/Ai-calling-V3

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
else
    echo "⚠️  No .env file found"
fi

# Start TW2GEM Server (port 12001)
echo "🤖 Starting TW2GEM Server on port 12001..."
npm run tw2gem-server > tw2gem-server.log 2>&1 &
TW2GEM_PID=$!
echo "TW2GEM Server PID: $TW2GEM_PID"

# Wait for TW2GEM server to start
sleep 5

# Check if TW2GEM server started successfully
if ! kill -0 $TW2GEM_PID 2>/dev/null; then
    echo "❌ TW2GEM Server failed to start"
    cat tw2gem-server.log
    exit 1
fi

# Verify TW2GEM server is listening
if check_port 12001; then
    echo "✅ TW2GEM Server is running on port 12001"
else
    echo "❌ TW2GEM Server is not listening on port 12001"
    exit 1
fi

# Start Dashboard (port 12000)
echo "🖥️  Starting Dashboard on port 12000..."
cd dashboard
npm run dev -- --host 0.0.0.0 --port 12000 > dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo "Dashboard PID: $DASHBOARD_PID"

# Wait for dashboard to start
sleep 8

# Check if dashboard started successfully
if ! kill -0 $DASHBOARD_PID 2>/dev/null; then
    echo "❌ Dashboard failed to start"
    cat dashboard.log
    exit 1
fi

# Verify dashboard is listening
if check_port 12000; then
    echo "✅ Dashboard is running on port 12000"
else
    echo "❌ Dashboard is not listening on port 12000"
    exit 1
fi

echo ""
echo "🎉 All services started successfully!"
echo ""
echo "📊 Dashboard: https://work-1-kzgzbusfqxqopdna.prod-runtime.all-hands.dev"
echo "🤖 TW2GEM Server: https://work-2-kzgzbusfqxqopdna.prod-runtime.all-hands.dev"
echo "📞 Twilio Webhook: https://work-2-kzgzbusfqxqopdna.prod-runtime.all-hands.dev/webhook"
echo ""
echo "📝 Logs:"
echo "   TW2GEM: tail -f /workspace/Ai-calling-V3/tw2gem-server.log"
echo "   Dashboard: tail -f /workspace/Ai-calling-V3/dashboard/dashboard.log"
echo ""
echo "🔧 Process IDs:"
echo "   TW2GEM Server: $TW2GEM_PID"
echo "   Dashboard: $DASHBOARD_PID"
echo ""

# Save PIDs for later management
echo "$TW2GEM_PID" > /tmp/tw2gem.pid
echo "$DASHBOARD_PID" > /tmp/dashboard.pid

echo "✅ Service startup complete!"