#!/bin/bash

# Quick start script for RentProof (Frontend + Backend)

echo "🚀 Starting RentProof..."
echo ""

# Check if processes are already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Frontend (port 3000) is already running"
else
    echo "Starting frontend..."
fi

if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Backend (port 8000) is already running"
else
    echo "Starting backend..."
fi

echo ""
echo "📝 Setup Instructions:"
echo ""
echo "Terminal 1 - Frontend:"
echo "  cd /Users/atharvranjan/rentproof"
echo "  npm run dev"
echo "  → Frontend will run on http://localhost:3000"
echo ""
echo "Terminal 2 - Backend:"
echo "  cd /Users/atharvranjan/rentproof/backend"
echo "  source venv/bin/activate"
echo "  python main.py"
echo "  → Backend will run on http://localhost:8000"
echo ""
echo "API Documentation:"
echo "  → Swagger UI: http://localhost:8000/docs"
echo "  → ReDoc: http://localhost:8000/redoc"
echo ""
echo "If frontend cannot reach backend, set NEXT_PUBLIC_API_URL=http://localhost:8000/api in .env.local"
echo ""
