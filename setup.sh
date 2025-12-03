#!/bin/bash
# AI Story Game - Database Setup Script

echo "🗄️  AI Story Game - Database Setup"
echo ""

# Check if database already exists
if [ -f "app.db" ]; then
    echo "⚠️  Database already exists: app.db"
    echo "   Skipping initialization to preserve existing data."
    echo "   To reset, delete app.db and run this script again."
    echo ""
    exit 0
fi

# Check if init SQL file exists
if [ ! -f "init-db.sql" ]; then
    echo "❌ Error: init-db.sql not found!"
    echo "   This file should be included in the repository."
    exit 1
fi

echo "📋 Initializing database from init-db.sql..."

# Run the setup script
npx tsx scripts/setup-db.ts

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Start the application: npm run dev"
echo "   2. Open http://localhost:5000"
echo "   3. Go to Settings and enter your API keys"
echo "   4. Start creating stories!"
echo ""
