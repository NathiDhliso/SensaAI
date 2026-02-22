#!/bin/bash

echo "🔍 Production Readiness Check"
echo "=============================="

# Check for console.log
echo ""
echo "📝 Checking for console.log statements..."
CONSOLE_COUNT=$(grep -r "console.log" src/ --exclude-dir=node_modules 2>/dev/null | wc -l)
echo "Found $CONSOLE_COUNT console.log statements"
if [ "$CONSOLE_COUNT" -gt 50 ]; then
    echo "⚠️  Warning: High number of console.log statements"
fi

# Check for TODO comments
echo ""
echo "📋 Checking for TODO comments..."
TODO_COUNT=$(grep -r "TODO:" src/ --exclude-dir=node_modules 2>/dev/null | wc -l)
echo "Found $TODO_COUNT TODO comments"
if [ "$TODO_COUNT" -gt 0 ]; then
    echo "⚠️  Warning: Unresolved TODO items"
    grep -r "TODO:" src/ --exclude-dir=node_modules 2>/dev/null | head -5
fi

# Check for localhost references
echo ""
echo "🌐 Checking for localhost references..."
LOCALHOST_COUNT=$(grep -r "localhost" src/ --exclude-dir=node_modules 2>/dev/null | wc -l)
echo "Found $LOCALHOST_COUNT localhost references"
if [ "$LOCALHOST_COUNT" -gt 0 ]; then
    echo "⚠️  Warning: Localhost references found"
fi

# Check environment files
echo ""
echo "⚙️  Checking environment files..."
if [ -f ".env.production" ]; then
    echo "✅ .env.production exists"
else
    echo "❌ .env.production missing - copy from .env.production.example"
fi

if [ -f "backend/.env.production" ]; then
    echo "✅ backend/.env.production exists"
else
    echo "❌ backend/.env.production missing - copy from backend/.env.production.example"
fi

# Check for hardcoded secrets
echo ""
echo "🔐 Checking for potential secrets..."
SECRET_PATTERNS=("password" "secret" "api_key" "apikey" "token")
for pattern in "${SECRET_PATTERNS[@]}"; do
    COUNT=$(grep -ri "$pattern" src/ --exclude-dir=node_modules 2>/dev/null | grep -v "placeholder" | grep -v "example" | wc -l)
    if [ "$COUNT" -gt 0 ]; then
        echo "⚠️  Found $COUNT potential secrets with pattern: $pattern"
    fi
done

# Check build
echo ""
echo "🏗️  Testing production build..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Production build successful"
    
    # Check build size
    if [ -d "dist" ]; then
        BUILD_SIZE=$(du -sh dist | cut -f1)
        echo "📦 Build size: $BUILD_SIZE"
    fi
else
    echo "❌ Production build failed"
fi

echo ""
echo "✅ Check complete!"
echo ""
echo "Next steps:"
echo "1. Review warnings above"
echo "2. Create .env.production from .env.production.example"
echo "3. Update CORS_ORIGINS in backend"
echo "4. Implement role-based access control"
echo "5. Set up error tracking (Sentry)"
