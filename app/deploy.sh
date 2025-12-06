#!/bin/bash

# Exit survey deployment script for AWS EC2
# This script pulls the latest Docker images and restarts the containers

set -e  # Exit on any error

echo "🚀 Starting deployment..."

# Configuration
GITHUB_REGISTRY="ghcr.io"
GITHUB_USER="ataloss-johnelbourne"
REPO_NAME="website-evaluation"
PROJECT_DIR="/home/ubuntu/apps/website-evaluation"
NGINX_DIR="/home/ubuntu/apps/nginx"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running as root or with sudo
if [ "$EUID" -eq 0 ]; then 
    print_warning "Running as root"
fi

# Navigate to project directory
cd "$PROJECT_DIR" || { print_error "Project directory not found: $PROJECT_DIR"; exit 1; }
print_step "Changed to project directory: $PROJECT_DIR"

# Pull latest images
print_step "Pulling latest Docker images..."
docker pull ${GITHUB_REGISTRY}/${GITHUB_USER}/${REPO_NAME}/survey-api:latest || { print_error "Failed to pull API image"; exit 1; }
docker pull ${GITHUB_REGISTRY}/${GITHUB_USER}/${REPO_NAME}/survey-web:latest || { print_error "Failed to pull Web image"; exit 1; }

# Stop existing containers
print_step "Stopping existing containers..."
docker compose -f docker-compose.prod.yml down || print_warning "No containers to stop"

# Start new containers
print_step "Starting new containers..."
docker compose -f docker-compose.prod.yml up -d || { print_error "Failed to start containers"; exit 1; }

# Wait for health checks
print_step "Waiting for containers to be healthy..."
sleep 10

# Check container status
print_step "Checking container status..."
docker compose -f docker-compose.prod.yml ps

# Check if containers are running
if docker ps | grep -q "survey_api"; then
    print_step "API container is running"
else
    print_error "API container failed to start"
    docker logs survey_api --tail 50
    exit 1
fi

if docker ps | grep -q "survey_api_web"; then
    print_step "Web container is running"
else
    print_error "Web container failed to start"
    docker logs survey_api_web --tail 50
    exit 1
fi

# Cleanup old images
print_step "Cleaning up old images..."
docker image prune -f

echo ""
print_step "Deployment completed successfully! 🎉"
echo ""
echo "Container Status:"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "API Health: http://localhost:3000/api/health"
echo "Web Static: http://localhost:8080/exit-intent-survey.js"
