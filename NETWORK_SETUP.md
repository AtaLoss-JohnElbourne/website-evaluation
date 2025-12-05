# Docker Network Setup for apps.ataloss.org

This document describes how to set up the shared Docker network that allows nginx and survey containers to communicate.

## Overview

Both the nginx reverse proxy and the survey application containers need to communicate with each other. They do this via a shared Docker network called `apps-network`.

## One-Time Setup on AWS Server

Run these commands once on your AWS EC2 server:

```bash
# Create the external Docker network
docker network create apps-network

# Verify it was created
docker network ls | grep apps-network
```

## Adding nginx to the Network

Your nginx Docker setup needs to join this network. Add this to your nginx docker-compose.yml:

```yaml
services:
  nginx:
    # ... your existing nginx config ...
    networks:
      - apps-network

networks:
  apps-network:
    external: true
    name: apps-network
```

Then restart nginx:

```bash
cd ~/path/to/nginx/docker-compose
docker-compose down
docker-compose up -d
```

## Deploy Survey Application

After creating the network and updating nginx:

```bash
cd ~/apps/website-evaluation/app
./deploy.sh
```

The deploy script will:
1. Pull latest images from GitHub Container Registry
2. Stop old containers
3. Start new containers that join the `apps-network`
4. Run health checks

## Verification

Test that containers can communicate:

```bash
# Check nginx can reach API
docker exec nginx_container wget -O- http://survey_api:3000/api/health

# Check nginx can reach web server
docker exec nginx_container wget -O- http://survey_api_web:80/exit-intent-survey.js

# Test via public URL
curl https://apps.ataloss.org/survey-api/health
curl https://apps.ataloss.org/survey-web/exit-intent-survey.js
```

## Network Architecture

```
Internet (HTTPS)
    ↓
apps.ataloss.org (SSL termination)
    ↓
nginx container
    ├─→ survey_api:3000 (Node.js API)
    └─→ survey_api_web:80 (Static files)
    
All containers connected via apps-network bridge
```

## Troubleshooting

**If containers can't communicate:**

```bash
# Check which containers are on the network
docker network inspect apps-network

# Verify both nginx and survey containers are listed
# You should see: nginx, survey_api, survey_api_web
```

**If nginx shows "upstream not found":**

```bash
# Ensure nginx container is on apps-network
docker inspect nginx_container | grep -A 10 Networks

# Restart nginx to re-join network
docker restart nginx_container
```
