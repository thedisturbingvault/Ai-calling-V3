#!/bin/bash

# AI Calling V3 - Service Status Check
echo "🔍 Checking AI Calling V3 Services..."
echo ""

# Check TW2GEM Server (port 12001)
echo "🤖 TW2GEM Server (port 12001):"
if curl -s --connect-timeout 3 http://localhost:12001 >/dev/null 2>&1; then
    echo "   ✅ Running and responding"
    echo "   🌐 External URL: https://work-2-kzgzbusfqxqopdna.prod-runtime.all-hands.dev"
else
    echo "   ❌ Not responding"
fi

echo ""

# Check Dashboard (port 12000)
echo "🖥️  Dashboard (port 12000):"
if curl -s --connect-timeout 3 http://localhost:12000 >/dev/null 2>&1; then
    echo "   ✅ Running and responding"
    echo "   🌐 External URL: https://work-1-kzgzbusfqxqopdna.prod-runtime.all-hands.dev"
else
    echo "   ❌ Not responding"
fi

echo ""

# Check processes
echo "📊 Process Status:"
TW2GEM_PROC=$(ps aux | grep "tw2gem-server-runner.js" | grep -v grep | wc -l)
DASHBOARD_PROC=$(ps aux | grep "vite.*12000" | grep -v grep | wc -l)

echo "   TW2GEM Server processes: $TW2GEM_PROC"
echo "   Dashboard processes: $DASHBOARD_PROC"

echo ""
echo "📝 Log files:"
echo "   TW2GEM: /workspace/Ai-calling-V3/tw2gem-server.log"
echo "   Dashboard: /workspace/Ai-calling-V3/dashboard/dashboard.log"