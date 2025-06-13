#!/bin/bash

# AI Calling V3 - Service Stop Script
# This script cleanly stops all services

echo "🛑 Stopping AI Calling V3 Services..."

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    echo "🔍 Stopping processes on port $port..."
    
    # Find and kill processes using the port
    local pids=$(netstat -tulpn 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | grep -v '-' | sort -u)
    
    if [ ! -z "$pids" ]; then
        echo "⚠️  Killing processes on port $port: $pids"
        for pid in $pids; do
            if [ "$pid" != "" ] && [ "$pid" != "-" ]; then
                kill -TERM $pid 2>/dev/null || true
                sleep 2
                kill -9 $pid 2>/dev/null || true
            fi
        done
    else
        echo "✅ No processes found on port $port"
    fi
}

# Stop services using saved PIDs
if [ -f /tmp/tw2gem.pid ]; then
    TW2GEM_PID=$(cat /tmp/tw2gem.pid)
    if kill -0 $TW2GEM_PID 2>/dev/null; then
        echo "🤖 Stopping TW2GEM Server (PID: $TW2GEM_PID)..."
        kill -TERM $TW2GEM_PID 2>/dev/null || true
        sleep 2
        kill -9 $TW2GEM_PID 2>/dev/null || true
    fi
    rm -f /tmp/tw2gem.pid
fi

if [ -f /tmp/dashboard.pid ]; then
    DASHBOARD_PID=$(cat /tmp/dashboard.pid)
    if kill -0 $DASHBOARD_PID 2>/dev/null; then
        echo "🖥️  Stopping Dashboard (PID: $DASHBOARD_PID)..."
        kill -TERM $DASHBOARD_PID 2>/dev/null || true
        sleep 2
        kill -9 $DASHBOARD_PID 2>/dev/null || true
    fi
    rm -f /tmp/dashboard.pid
fi

# Kill any remaining processes
echo "🧹 Cleaning up remaining processes..."

# Kill vite processes
pkill -f "vite" 2>/dev/null || true
pkill -f "node.*vite" 2>/dev/null || true
pkill -f "npm.*vite" 2>/dev/null || true

# Kill tw2gem processes
pkill -f "tw2gem" 2>/dev/null || true
pkill -f "npm.*tw2gem" 2>/dev/null || true

# Kill processes on specific ports
kill_port 12000
kill_port 12001

# Wait for cleanup
sleep 3

echo "✅ All services stopped!"