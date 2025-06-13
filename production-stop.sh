#!/bin/bash

# AI Calling V3 - Production Stop Script
# Cleanly shuts down all services

echo "🛑 Stopping AI Calling V3 Production System..."

# Function to stop service by PID file
stop_service() {
    local service_name=$1
    local pid_file=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        echo "🛑 Stopping $service_name (PID: $pid)..."
        
        if kill "$pid" 2>/dev/null; then
            echo "   Sent TERM signal to $service_name"
            sleep 3
            
            # Check if still running
            if kill -0 "$pid" 2>/dev/null; then
                echo "   Force killing $service_name..."
                kill -9 "$pid" 2>/dev/null || true
            fi
            
            echo "✅ $service_name stopped"
        else
            echo "⚠️  $service_name was not running"
        fi
        
        rm -f "$pid_file"
    else
        echo "⚠️  No PID file found for $service_name"
    fi
}

# Stop services using PID files
stop_service "TW2GEM Server" "/workspace/Ai-calling-V3/tw2gem.pid"
stop_service "Dashboard" "/workspace/Ai-calling-V3/dashboard.pid"

# Clean up any remaining processes
echo "🧹 Cleaning up remaining processes..."
pkill -f "tw2gem-server-runner" 2>/dev/null || true
pkill -f "http.server.*12000" 2>/dev/null || true
pkill -f "http.server.*8080" 2>/dev/null || true
pkill -f "vite.*12000" 2>/dev/null || true
pkill -f "serve.*12000" 2>/dev/null || true

# Wait for cleanup
sleep 2

# Verify ports are free
echo "🔍 Verifying ports are free..."
for port in 12000 12001 8080; do
    if curl -s --connect-timeout 1 http://localhost:$port >/dev/null 2>&1; then
        echo "⚠️  Port $port still in use"
    else
        echo "✅ Port $port is free"
    fi
done

echo ""
echo "✅ AI Calling V3 Production System stopped successfully!"
echo "   All services have been shut down cleanly."
echo ""
echo "To restart: ./production-start.sh"