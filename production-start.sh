#!/bin/bash

# AI Calling V3 - Production Startup Script
# Ensures clean startup with proper port management

set -e

echo "🚀 Starting AI Calling V3 Production System..."

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    echo "🧹 Cleaning up port $port..."
    
    # Try multiple methods to kill processes on the port
    pkill -f ":$port" 2>/dev/null || true
    pkill -f "port.*$port" 2>/dev/null || true
    pkill -f "$port" 2>/dev/null || true
    
    # Wait for cleanup
    sleep 2
    
    # Verify port is free
    if curl -s --connect-timeout 1 http://localhost:$port >/dev/null 2>&1; then
        echo "⚠️  Port $port still in use, force killing..."
        pkill -9 -f ":$port" 2>/dev/null || true
        sleep 3
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local port=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $name on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --connect-timeout 1 http://localhost:$port >/dev/null 2>&1; then
            echo "✅ $name is ready on port $port"
            return 0
        fi
        echo "   Attempt $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $name failed to start on port $port"
    return 1
}

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "vite\|serve\|http.server\|tw2gem" 2>/dev/null || true
sleep 3

# Kill specific ports
kill_port 12000
kill_port 12001
kill_port 8080

# Start TW2GEM Server (Backend)
echo "🔧 Starting TW2GEM Server on port 12001..."
cd /workspace/Ai-calling-V3
nohup node tw2gem-server-runner.js > tw2gem.log 2>&1 &
TW2GEM_PID=$!
echo "TW2GEM Server PID: $TW2GEM_PID"

# Wait for TW2GEM to be ready
if wait_for_service 12001 "TW2GEM Server"; then
    echo "✅ TW2GEM Server started successfully"
else
    echo "❌ TW2GEM Server failed to start"
    exit 1
fi

# Start Dashboard (Frontend) - Try port 12000 first, fallback to 8080
echo "🎨 Starting Dashboard..."
cd /workspace/Ai-calling-V3/dashboard/dist

# Try port 12000 first
echo "   Attempting port 12000..."
if python3 -m http.server 12000 --bind 0.0.0.0 > ../dashboard.log 2>&1 &
then
    DASHBOARD_PID=$!
    sleep 3
    
    if wait_for_service 12000 "Dashboard"; then
        echo "✅ Dashboard started on port 12000"
        DASHBOARD_PORT=12000
    else
        echo "⚠️  Port 12000 failed, trying port 8080..."
        kill $DASHBOARD_PID 2>/dev/null || true
        
        # Fallback to port 8080
        python3 -m http.server 8080 --bind 0.0.0.0 > ../dashboard.log 2>&1 &
        DASHBOARD_PID=$!
        
        if wait_for_service 8080 "Dashboard"; then
            echo "✅ Dashboard started on port 8080 (fallback)"
            DASHBOARD_PORT=8080
        else
            echo "❌ Dashboard failed to start on both ports"
            exit 1
        fi
    fi
else
    echo "⚠️  Port 12000 unavailable, using port 8080..."
    python3 -m http.server 8080 --bind 0.0.0.0 > ../dashboard.log 2>&1 &
    DASHBOARD_PID=$!
    
    if wait_for_service 8080 "Dashboard"; then
        echo "✅ Dashboard started on port 8080"
        DASHBOARD_PORT=8080
    else
        echo "❌ Dashboard failed to start"
        exit 1
    fi
fi

# Save PIDs for cleanup
echo "$TW2GEM_PID" > /workspace/Ai-calling-V3/tw2gem.pid
echo "$DASHBOARD_PID" > /workspace/Ai-calling-V3/dashboard.pid

# Final verification
echo ""
echo "🎉 AI Calling V3 Production System Started Successfully!"
echo ""
echo "📊 Service Status:"
echo "   🔧 TW2GEM Server: http://localhost:12001 (PID: $TW2GEM_PID)"
echo "   🎨 Dashboard: http://localhost:$DASHBOARD_PORT (PID: $DASHBOARD_PID)"
echo ""
echo "🌐 External URLs:"
echo "   🔧 TW2GEM: https://work-2-kzgzbusfqxqopdna.prod-runtime.all-hands.dev"
if [ "$DASHBOARD_PORT" = "12000" ]; then
    echo "   🎨 Dashboard: https://work-1-kzgzbusfqxqopdna.prod-runtime.all-hands.dev"
else
    echo "   🎨 Dashboard: http://localhost:8080 (port 12000 unavailable)"
fi
echo ""
echo "📞 Twilio Webhook: https://work-2-kzgzbusfqxqopdna.prod-runtime.all-hands.dev/webhook"
echo ""
echo "✅ System is LIVE and ready for production use!"
echo ""
echo "To stop services: ./production-stop.sh"