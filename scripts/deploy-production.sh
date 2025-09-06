#!/bin/bash
set -e

# Production Deployment Script with Zero Downtime
# Updated: Testing VPN-enabled deployment via Windows self-hosted runner
# Usage: ./deploy-production.sh <image-tag>

IMAGE_TAG=${1:-latest}
CONTAINER_NAME="mirabel-api"
NEW_CONTAINER_NAME="mirabel-api-new"
BACKUP_CONTAINER_NAME="mirabel-api-backup"
IMAGE_NAME="ghcr.io/jcolermirabel/mirabel-api:${IMAGE_TAG}"
PORT=3001
HEALTH_ENDPOINT="http://localhost:${PORT}/health"
MAX_HEALTH_CHECKS=30
HEALTH_CHECK_INTERVAL=2
# Increase attempts during test phase to allow warm-up
TEST_MAX_HEALTH_CHECKS=60

echo "🚀 Starting production deployment of ${IMAGE_NAME}"

# Function to check health
health_check() {
    local endpoint=$1
    local max_attempts=$2
    local interval=$3
    
    echo "🔍 Health checking ${endpoint}..."
    for i in $(seq 1 $max_attempts); do
        if curl -f -s $endpoint > /dev/null 2>&1; then
            echo "✅ Health check passed (attempt $i)"
            return 0
        fi
        echo "⏳ Health check failed, retrying in ${interval}s (attempt $i/$max_attempts)"
        sleep $interval
    done
    echo "❌ Health check failed after $max_attempts attempts"
    return 1
}

# Function to rollback
rollback() {
    echo "🔄 Rolling back to previous version..."
    docker stop $NEW_CONTAINER_NAME 2>/dev/null || true
    docker rm $NEW_CONTAINER_NAME 2>/dev/null || true
    
    if [ "$INITIAL_DEPLOYMENT" = "false" ]; then
        if docker ps -a -q -f name=$BACKUP_CONTAINER_NAME | grep -q .; then
            echo "🔄 Starting backup container..."
            docker start $BACKUP_CONTAINER_NAME
            docker rename $BACKUP_CONTAINER_NAME $CONTAINER_NAME
            echo "✅ Rollback completed"
        else
            echo "❌ No backup container found for rollback!"
            exit 1
        fi
    else
        echo "⚠️  Initial deployment failed - no container to rollback to"
        exit 1
    fi
}

# Trap to handle failures
trap 'echo "❌ Deployment failed!"; rollback; exit 1' ERR

# Pre-flight checks
echo "🔍 Pre-flight checks..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    exit 1
fi

# Check if current container exists (running or stopped)
if ! docker ps -a -q -f name=^${CONTAINER_NAME}$ | grep -q .; then
    echo "⚠️  No container found with name: $CONTAINER_NAME"
    echo "🆕 This appears to be an initial deployment"
    INITIAL_DEPLOYMENT=true
else
    echo "✅ Found existing container: $CONTAINER_NAME"
    INITIAL_DEPLOYMENT=false
fi

# Pull new image
echo "📥 Pulling new image: ${IMAGE_NAME}"
docker pull $IMAGE_NAME

# Backup current container (if exists)
if [ "$INITIAL_DEPLOYMENT" = "false" ]; then
    echo "💾 Creating backup of current container..."
    
    # Remove any existing backup container
    if docker ps -a -q -f name=^${BACKUP_CONTAINER_NAME}$ | grep -q .; then
        echo "🧹 Removing existing backup container..."
        docker stop $BACKUP_CONTAINER_NAME 2>/dev/null || true
        docker rm $BACKUP_CONTAINER_NAME 2>/dev/null || true
    fi
    
    # Check if main container exists before trying to rename it
    if docker ps -a -q -f name=^${CONTAINER_NAME}$ | grep -q .; then
        echo "📦 Renaming $CONTAINER_NAME to $BACKUP_CONTAINER_NAME"
        docker rename $CONTAINER_NAME $BACKUP_CONTAINER_NAME
        docker stop $BACKUP_CONTAINER_NAME 2>/dev/null || true
    else
        echo "❌ Container $CONTAINER_NAME not found for backup!"
        echo "🔍 Available containers:"
        docker ps -a --format "table {{.Names}}\t{{.Status}}"
        exit 1
    fi
else
    echo "🆕 Skipping backup for initial deployment"
fi

# Clean up any existing test containers
if docker ps -a -q -f name=$NEW_CONTAINER_NAME | grep -q .; then
    echo "🧹 Cleaning up existing test container..."
    docker stop $NEW_CONTAINER_NAME 2>/dev/null || true
    docker rm $NEW_CONTAINER_NAME 2>/dev/null || true
fi

echo "🆕 Starting new container for testing (host network on port 3003)..."
docker run -d \
    --name $NEW_CONTAINER_NAME \
    --network host \
    --env-file /home/ubuntu/mirabel-api/server/.env.production \
    -e PORT=3003 \
    -e BIND_HOST=0.0.0.0 \
    -e DISABLE_GRAPHQL=true \
    -e STAGING_CONTINUE_ON_GRAPHQL_ERROR=true \
    -e DISABLE_SCHEDULER=true \
    -e NODE_ENV=production \
    -e LOG_LEVEL=debug \
    -e DEBUG=* \
    --entrypoint sh \
    $IMAGE_NAME -c "node --trace-uncaught --unhandled-rejections=strict /app/server/server.js"

# Initial short wait and diagnostics to capture early failures
sleep 3
echo "🔍 Initial container state after 3s:"
docker inspect -f 'Status={{.State.Status}} ExitCode={{.State.ExitCode}} OOMKilled={{.State.OOMKilled}} Error={{.State.Error}}' $NEW_CONTAINER_NAME || true
echo "🔍 Initial logs (last 200 lines):"
docker logs $NEW_CONTAINER_NAME --tail 200 || true

# Environment diagnostics (compare backup vs new)
if [ "$INITIAL_DEPLOYMENT" = "false" ]; then
  echo "🔍 Env (backup container):"
  docker inspect -f '{{json .Config.Env}}' $BACKUP_CONTAINER_NAME || true
fi

echo "🔍 Env (new test container):"
docker inspect -f '{{json .Config.Env}}' $NEW_CONTAINER_NAME || true

# Health check new container on host port 3003
if ! health_check "http://localhost:3003/health" $TEST_MAX_HEALTH_CHECKS $HEALTH_CHECK_INTERVAL; then
    echo "❌ New container failed health check"
    echo "🔍 Container state:"
    docker inspect -f 'Status={{.State.Status}} ExitCode={{.State.ExitCode}} Error={{.State.Error}} StartedAt={{.State.StartedAt}} FinishedAt={{.State.FinishedAt}}' $NEW_CONTAINER_NAME || true
    echo "🔍 Container logs (last 500 lines):"
    docker logs $NEW_CONTAINER_NAME --tail 500 || true
    echo "🔍 Container status:"
    docker ps -a -f name=$NEW_CONTAINER_NAME || true
    echo "🔍 Port check on host (3003):"
    (ss -lntp 2>/dev/null || netstat -tlnp 2>/dev/null || true) | (grep ':3003' || true)
    echo "🔍 lsof (if available) on 3003:"
    (lsof -i :3003 2>/dev/null || true)
    echo "🔄 Initiating rollback due to health check failure..."
    rollback
    exit 1
fi

# Test critical endpoints (host 3003)
echo "🧪 Testing critical endpoints..."
endpoints=(
    "http://localhost:3003/"
    "http://localhost:3003/health"
)

for endpoint in "${endpoints[@]}"; do
    if ! curl -f -s $endpoint > /dev/null; then
        echo "❌ Critical endpoint failed: $endpoint"
        echo "🔄 Initiating rollback due to endpoint failure..."
        rollback
        exit 1
    fi
    echo "✅ Endpoint OK: $endpoint"
done

# Stop new container and restart on production port
echo "🔄 Switching to production port..."
docker stop $NEW_CONTAINER_NAME
docker rm $NEW_CONTAINER_NAME

# Start new container on production port
docker run -d \
    --name $CONTAINER_NAME \
    --network host \
    --env-file /home/ubuntu/mirabel-api/server/.env.production \
    --restart unless-stopped \
    $IMAGE_NAME

# Final health check
if ! health_check $HEALTH_ENDPOINT $MAX_HEALTH_CHECKS $HEALTH_CHECK_INTERVAL; then
    echo "❌ Final health check failed"
    echo "🔄 Initiating rollback due to final health check failure..."
    rollback
    exit 1
fi

# Update Nginx if needed (ensure it's proxying to the right port)
echo "🔄 Reloading Nginx configuration..."
sudo nginx -t && sudo systemctl reload nginx

# Final verification through domain
echo "🌐 Testing domain access..."
if curl -f -s https://staging-api.magazinemanager.biz/health > /dev/null; then
    echo "✅ Domain access confirmed"
else
    echo "❌ Domain access failed"
    echo "🔄 Initiating rollback due to domain access failure..."
    rollback
    exit 1
fi

# Cleanup backup container after successful deployment
if [ "$INITIAL_DEPLOYMENT" = "false" ]; then
    echo "🧹 Cleaning up backup container..."
    docker stop $BACKUP_CONTAINER_NAME
    docker rm $BACKUP_CONTAINER_NAME
else
    echo "🆕 Initial deployment completed - no backup to clean up"
fi

# Cleanup old images (keep last 3)
echo "🧹 Cleaning up old images..."
docker images --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | \
    grep "ghcr.io/jcolermirabel/mirabel-api" | \
    tail -n +4 | \
    awk '{print $1}' | \
    xargs -r docker rmi

echo "🎉 Production deployment completed successfully!"
echo "📊 Container status:"
docker ps -f name=$CONTAINER_NAME --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
