#!/bin/bash
# Setup script for GitHub Codespaces / Dev Containers

echo "🚀 Setting up Shot On Me development environment..."

# Install dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install

echo "📦 Installing Shot On Me dependencies..."
cd ../shot-on-me && npm install

echo "📦 Installing Venue Portal dependencies..."
cd ../venue-portal && npm install

echo "📦 Installing Owner Portal dependencies..."
cd ../owner-portal && npm install

echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Configure .env files in each directory"
echo "   2. Start servers with: npm run dev"
echo ""
echo "🌐 Ports:"
echo "   Backend: 5000"
echo "   Shot On Me: 3001"
echo "   Venue Portal: 3000"
echo "   Owner Portal: 3002"

