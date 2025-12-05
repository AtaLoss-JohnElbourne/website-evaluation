# Deployment Guide - AWS EC2

## Prerequisites

- AWS EC2 instance running Ubuntu with Docker installed
- Domain `apps.ataloss.org` pointing to your EC2 instance
- GitHub account with access to push images
- SSH access to EC2 instance

## Initial Setup

### 1. Enable GitHub Container Registry

The GitHub Actions workflow will automatically build and push images to GitHub Container Registry (ghcr.io) on every push to `main`.

**Make the repository packages public:**
1. Go to https://github.com/AtaLoss-JohnElbourne/website-evaluation/packages
2. For each package (survey-api, survey-web), click "Package settings"
3. Scroll to "Danger Zone" → "Change visibility" → "Public"

### 2. Prepare EC2 Server

SSH into your EC2 instance:
```bash
ssh ubuntu@apps.ataloss.org
```

Install Docker and Docker Compose (if not already installed):
```bash
# Update package list
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Log out and back in for group changes to take effect
exit
# SSH back in
ssh ubuntu@apps.ataloss.org

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### 3. Clone Repository on EC2

```bash
cd /home/ubuntu
git clone https://github.com/AtaLoss-JohnElbourne/website-evaluation.git
cd website-evaluation/app
```

### 4. Configure Environment

Create `.env` file with production values:
```bash
cd /home/ubuntu/website-evaluation/app
nano .env
```

Add your production environment variables:
```env
# Azure App Registration
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id

# SharePoint Configuration
SHAREPOINT_SITE_URL=https://yourtenant.sharepoint.com/sites/yoursite
EXCEL_FILE_PATH=/Shared Documents/Website Evaluation.xlsx
WORKSHEET_NAME=Dec Survey
TABLE_NAME=Survey_v2_1_Table

# Debug Endpoints (optional)
ENABLE_DEBUG_ENDPOINTS=true
DEBUG_PASSWORD=test123

# Node Environment
NODE_ENV=production
```

### 5. Configure Nginx

Add the configuration to your nginx container's config directory:

```bash
# Find your nginx config volume location
docker inspect nginx | grep -A 5 "Mounts"

# Common locations:
# /home/ubuntu/apps/nginx/conf.d/
# /etc/nginx/conf.d/ (if bind-mounted)

# Copy the config (adjust path to match your setup)
sudo cp /home/ubuntu/website-evaluation/nginx/apps-ataloss.conf /home/ubuntu/apps/nginx/conf.d/apps-ataloss.conf

# Test and reload nginx in container
docker exec nginx nginx -t
docker exec nginx nginx -s reload
```

### 6. Setup SSL with Certbot

Your SSL is already managed by your certbot container. Just ensure the domain `apps.ataloss.org` is configured in your certbot setup.

### 7. Make Deployment Script Executable

```bash
chmod +x /home/ubuntu/website-evaluation/app/deploy.sh
```

## Deployment Workflow

### Automated (Recommended)

1. **Push to GitHub main branch:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **GitHub Actions automatically:**
   - Builds Docker images
   - Pushes to GitHub Container Registry
   - Tags with `latest` and commit SHA

3. **Deploy on EC2:**
   ```bash
   ssh ubuntu@apps.ataloss.org
   cd /home/ubuntu/website-evaluation/app
   ./deploy.sh
   ```

### Manual Deployment

If you need to deploy without GitHub Actions:

```bash
# SSH into EC2
ssh ubuntu@apps.ataloss.org
cd /home/ubuntu/website-evaluation/app

# Pull latest code
git pull origin main

# Build images locally (if needed)
docker compose -f docker-compose.yml build

# Or pull from registry
docker pull ghcr.io/ataloss-johnelbourne/website-evaluation/survey-api:latest
docker pull ghcr.io/ataloss-johnelbourne/website-evaluation/survey-web:latest

# Restart containers
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps
docker logs survey_api --tail 50
docker logs survey_api_web --tail 50
```

## Monitoring

### Check Container Status
```bash
docker compose -f docker-compose.prod.yml ps
```

### View Logs
```bash
# API logs
docker logs survey_api -f

# Web logs
docker logs survey_api_web -f

# Nginx logs
sudo tail -f /var/log/nginx/apps-ataloss-access.log
sudo tail -f /var/log/nginx/apps-ataloss-error.log
```

### Health Checks
```bash
# API health
curl http://localhost:3000/api/health

# Web static file
curl http://localhost:8080/exit-intent-survey.js

# Public endpoints
curl https://apps.ataloss.org/survey-api/api/health
curl https://apps.ataloss.org/exit-intent-survey.js
```

## Rollback

If you need to rollback to a previous version:

```bash
# Pull specific version by SHA
docker pull ghcr.io/ataloss-johnelbourne/website-evaluation/survey-api:main-abc1234
docker pull ghcr.io/ataloss-johnelbourne/website-evaluation/survey-web:main-abc1234

# Tag as latest
docker tag ghcr.io/ataloss-johnelbourne/website-evaluation/survey-api:main-abc1234 ghcr.io/ataloss-johnelbourne/website-evaluation/survey-api:latest
docker tag ghcr.io/ataloss-johnelbourne/website-evaluation/survey-web:main-abc1234 ghcr.io/ataloss-johnelbourne/website-evaluation/survey-web:latest

# Restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Containers won't start
```bash
# Check logs
docker logs survey_api
docker logs survey_api_web

# Check .env file exists and has correct values
cat /home/ubuntu/website-evaluation/app/.env

# Check docker compose file
cat /home/ubuntu/website-evaluation/app/docker-compose.prod.yml
```

### 502 Bad Gateway
```bash
# Check if containers are running
docker ps

# Check nginx configuration
sudo nginx -t

# Check nginx logs
sudo tail -f /var/log/nginx/apps-ataloss-error.log
```

### Can't pull images from GitHub
```bash
# Make sure repository packages are public
# Or login to GitHub Container Registry:
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

## Updating the Application

1. Make changes locally
2. Test locally with `docker compose up`
3. Commit and push to GitHub
4. GitHub Actions builds new images
5. SSH to EC2 and run `./deploy.sh`
6. Verify deployment with health checks

## Security Notes

- `.env` file contains secrets - never commit to Git
- Keep GitHub Container Registry packages public, or setup authentication
- SSL certificates auto-renew via certbot
- Containers run on localhost only, nginx handles external traffic
- CORS configured for ataloss.org origin only
