#!/bin/bash

# AI Calling V3 - Deployment Verification Script
echo "🚀 AI Calling V3 - Production Deployment Verification"
echo "=================================================="
echo ""

# Check local services
echo "🔍 Local Service Status:"
echo ""

# TW2GEM Server
echo "🤖 TW2GEM Server (localhost:12001):"
TW2GEM_LOCAL=$(curl -s --connect-timeout 3 http://localhost:12001 2>/dev/null && echo "✅ Responding" || echo "❌ Not responding")
echo "   $TW2GEM_LOCAL"

# Dashboard
echo "🖥️  Dashboard (localhost:12000):"
DASHBOARD_LOCAL=$(timeout 3 curl -s http://localhost:12000 >/dev/null 2>&1 && echo "✅ Responding" || echo "❌ Not responding")
echo "   $DASHBOARD_LOCAL"

echo ""

# Check external URLs
echo "🌐 External URL Status:"
echo ""

echo "🤖 TW2GEM Server (External):"
echo "   URL: https://work-2-kzgzbusfqxqopdna.prod-runtime.all-hands.dev"
TW2GEM_EXT=$(curl -s --connect-timeout 5 https://work-2-kzgzbusfqxqopdna.prod-runtime.all-hands.dev 2>/dev/null && echo "✅ Accessible" || echo "❌ Not accessible")
echo "   Status: $TW2GEM_EXT"

echo ""

echo "🖥️  Dashboard (External):"
echo "   URL: https://work-1-kzgzbusfqxqopdna.prod-runtime.all-hands.dev"
DASHBOARD_EXT=$(timeout 5 curl -s https://work-1-kzgzbusfqxqopdna.prod-runtime.all-hands.dev >/dev/null 2>&1 && echo "✅ Accessible" || echo "❌ Not accessible")
echo "   Status: $DASHBOARD_EXT"

echo ""

# Process information
echo "📊 Process Information:"
echo ""

TW2GEM_PROCS=$(ps aux | grep "tw2gem-server-runner.js" | grep -v grep | wc -l)
DASHBOARD_PROCS=$(ps aux | grep "vite.*12000" | grep -v grep | wc -l)

echo "   TW2GEM Server processes: $TW2GEM_PROCS"
echo "   Dashboard processes: $DASHBOARD_PROCS"

if [ $TW2GEM_PROCS -gt 0 ] && [ $DASHBOARD_PROCS -gt 0 ]; then
    echo "   ✅ All processes running"
else
    echo "   ⚠️  Some processes may be missing"
fi

echo ""

# Configuration status
echo "⚙️  Configuration Status:"
echo ""

if [ -f "/workspace/Ai-calling-V3/.env" ]; then
    echo "   ✅ Root .env file exists"
else
    echo "   ❌ Root .env file missing"
fi

if [ -f "/workspace/Ai-calling-V3/dashboard/.env" ]; then
    echo "   ✅ Dashboard .env file exists"
else
    echo "   ❌ Dashboard .env file missing"
fi

# Check environment variables
if [ ! -z "$GEMINI_API_KEY" ]; then
    echo "   ✅ Gemini API key configured"
else
    echo "   ❌ Gemini API key missing"
fi

if [ ! -z "$SUPABASE_URL" ]; then
    echo "   ✅ Supabase URL configured"
else
    echo "   ❌ Supabase URL missing"
fi

if [ ! -z "$TWILIO_ACCOUNT_SID" ]; then
    echo "   ✅ Twilio credentials configured"
else
    echo "   ❌ Twilio credentials missing"
fi

echo ""

# Summary
echo "📋 Deployment Summary:"
echo ""

if [[ "$TW2GEM_LOCAL" == *"✅"* ]] && [[ "$DASHBOARD_LOCAL" == *"✅"* ]]; then
    echo "   ✅ Local services: OPERATIONAL"
else
    echo "   ❌ Local services: ISSUES DETECTED"
fi

if [[ "$TW2GEM_EXT" == *"✅"* ]] && [[ "$DASHBOARD_EXT" == *"✅"* ]]; then
    echo "   ✅ External access: OPERATIONAL"
else
    echo "   ❌ External access: ISSUES DETECTED"
fi

echo ""
echo "🎯 Ready for Production: $([ $TW2GEM_PROCS -gt 0 ] && [ $DASHBOARD_PROCS -gt 0 ] && echo "YES ✅" || echo "NO ❌")"
echo ""
echo "📞 Twilio Webhook URL: https://work-2-kzgzbusfqxqopdna.prod-runtime.all-hands.dev/webhook"
echo ""