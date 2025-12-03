#!/bin/bash
# AI Story Game - Complete Server Bootstrap Script
# For fresh Linux servers with nothing installed

set -e  # Exit on error

echo "🚀 AI Story Game - Server Bootstrap"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Required versions
NODE_VERSION="20.19.3"
MIN_INOTIFY_WATCHES=524288

#######################################
# 1. Check/Install Node.js
#######################################
echo "📦 Step 1: Checking Node.js..."

if command -v node &> /dev/null; then
    CURRENT_NODE=$(node -v)
    echo "✓ Node.js installed: $CURRENT_NODE"
    
    # Check if version is v20.x
    if [[ ! $CURRENT_NODE =~ ^v20\. ]]; then
        echo -e "${YELLOW}⚠️  Warning: Recommended Node.js v20.x, you have $CURRENT_NODE${NC}"
        echo "   Consider using nvm to install v20.19.3"
    fi
else
    echo -e "${RED}✗ Node.js not found${NC}"
    echo ""
    echo "Please install Node.js v20.x first:"
    echo ""
    echo "  # Using nvm (recommended):"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "  source ~/.bashrc"
    echo "  nvm install 20.19.3"
    echo "  nvm use 20.19.3"
    echo ""
    echo "  # Or download from: https://nodejs.org/"
    exit 1
fi

#######################################
# 2. Install Dependencies
#######################################
echo ""
echo "📦 Step 2: Installing dependencies..."

if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ package.json not found. Are you in the project directory?${NC}"
    exit 1
fi

npm install
echo "✓ Dependencies installed"

#######################################
# 3. Initialize Database
#######################################
echo ""
echo "🗄️  Step 3: Initializing database..."

if [ -f "app.db" ]; then
    echo -e "${YELLOW}⚠️  Database already exists: app.db${NC}"
    read -p "   Delete and recreate? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f app.db app.db-shm app.db-wal
        npx tsx scripts/setup-db.ts
        echo "✓ Database recreated"
    else
        echo "✓ Keeping existing database"
    fi
else
    npx tsx scripts/setup-db.ts
    echo "✓ Database initialized"
fi

#######################################
# 4. Check Linux File Watcher Limit
#######################################
echo ""
echo "🔧 Step 4: Checking Linux configuration..."

if [ -f "/proc/sys/fs/inotify/max_user_watches" ]; then
    CURRENT_WATCHES=$(cat /proc/sys/fs/inotify/max_user_watches)
    echo "   Current inotify watches: $CURRENT_WATCHES"
    
    if [ "$CURRENT_WATCHES" -lt "$MIN_INOTIFY_WATCHES" ]; then
        echo -e "${YELLOW}⚠️  inotify limit is low (< $MIN_INOTIFY_WATCHES)${NC}"
        echo ""
        echo "   To fix EMFILE errors, increase the limit:"
        echo "   sudo sysctl fs.inotify.max_user_watches=$MIN_INOTIFY_WATCHES"
        echo ""
        
        # Check if user has sudo
        if command -v sudo &> /dev/null; then
            read -p "   Increase limit now? (requires sudo) (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                sudo sysctl fs.inotify.max_user_watches=$MIN_INOTIFY_WATCHES
                echo "fs.inotify.max_user_watches=$MIN_INOTIFY_WATCHES" | sudo tee -a /etc/sysctl.conf > /dev/null
                echo "✓ inotify limit increased and persisted"
            fi
        fi
    else
        echo "✓ inotify limit is sufficient"
    fi
else
    echo "✓ Not a Linux system, skipping inotify check"
fi

#######################################
# 5. Environment Variables Check
#######################################
echo ""
echo "🔑 Step 5: API Keys Configuration"
echo ""
echo "After starting the server, configure your API keys in Settings:"
echo "  • OpenAI API Key (for ChatGPT)"
echo "  • Anthropic API Key (for Claude)"
echo "  • Google AI API Key (for Gemini)"
echo "  • xAI API Key (for Grok)"
echo ""

#######################################
# Summary
#######################################
echo ""
echo "=================================="
echo -e "${GREEN}✅ Bootstrap Complete!${NC}"
echo "=================================="
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Start the development server:"
echo "   npm run dev"
echo ""
echo "2. Open your browser:"
echo "   http://localhost:5000"
echo ""
echo "3. Go to Settings and enter your API keys"
echo ""
echo "4. Start creating stories!"
echo ""

# Optional: Ask if user wants to start server now
read -p "Start development server now? (Y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo ""
    echo "Starting server..."
    npm run dev
fi
