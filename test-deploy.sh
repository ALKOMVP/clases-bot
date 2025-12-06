#!/bin/bash
set -e

echo "🔨 Building..."
npm run build:cloudflare

echo "🚀 Deploying..."
DEPLOY_OUTPUT=$(npx wrangler pages deploy .vercel/output/static --project-name=clases-bot 2>&1)
DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[a-z0-9]*\.clases-bot\.pages\.dev' | head -1)

if [ -z "$DEPLOY_URL" ]; then
  echo "❌ Failed to get deployment URL"
  exit 1
fi

echo "✅ Deployed to: $DEPLOY_URL"
echo "⏳ Waiting 10 seconds for deployment to propagate..."
sleep 10

echo "🧪 Testing /api/test..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$DEPLOY_URL/api/test" 2>&1)
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "Response: $BODY"
echo "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ SUCCESS! API is working!"
  exit 0
else
  echo "❌ FAILED! HTTP Status: $HTTP_STATUS"
  exit 1
fi

