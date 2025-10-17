# Docker Deployment Guide

## 🐳 Docker Setup for Website Exit Survey API

### Quick Start

1. **Add your secrets to the `.env` file**:
   ```env
   AZURE_CLIENT_SECRET=your_actual_secret_value
   AZURE_TENANT_ID=your_tenant_id_or_leave_empty
   ```

2. **Build and run with Docker Compose**:
   ```bash
   cd app
   docker-compose up -d
   ```

3. **Test the deployment**:
   ```bash
   curl http://localhost:3000/api/health
   curl http://localhost:3000/api/test-sharepoint
   ```

### Manual Docker Commands

**Build the image**:
```bash
docker build -t survey-api .
```

**Run the container**:
```bash
docker run -d \
  --name survey_api \
  --env-file .env \
  -p 3000:3000 \
  --restart unless-stopped \
  survey-api
```

### Integration with Nginx

Your existing nginx config will work perfectly:

```nginx
# Exit Intent Survey API
location /survey-api {
    set $survey_api survey_api;
    proxy_pass http://$survey_api:3000;
    rewrite ^/survey-api(.*)$ $1 break;
    proxy_redirect            off;
    proxy_set_header          X-Real-IP $remote_addr;
    proxy_set_header          X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header          Host $host;
    proxy_set_header          X-Forwarded-Proto https;
}
```

### Container Management

**View logs**:
```bash
docker logs survey_api
docker logs -f survey_api  # Follow logs
```

**Check container status**:
```bash
docker ps
docker inspect survey_api
```

**Update deployment**:
```bash
docker-compose down
docker-compose up -d --build
```

**Stop and remove**:
```bash
docker-compose down
# Or manually:
docker stop survey_api
docker rm survey_api
```

### Health Monitoring

The container includes:
- **Health checks** every 30 seconds
- **Automatic restart** if container fails
- **Graceful shutdown** handling

**Check health**:
```bash
docker inspect --format='{{.State.Health.Status}}' survey_api
```

### Security Features

- **Non-root user** (`nodejs`) runs the application
- **Minimal Alpine Linux** base image
- **Production dependencies** only
- **Environment variables** for sensitive data

### Troubleshooting

**Container won't start**:
1. Check environment variables: `docker logs survey_api`
2. Verify .env file exists and has correct values
3. Test locally first: `npm start`

**SharePoint connection issues**:
1. Test endpoint: `curl http://localhost:3000/api/test-sharepoint`
2. Check Azure credentials in logs
3. Verify SharePoint site permissions

**Nginx proxy issues**:
1. Ensure container name matches nginx config (`survey_api`)
2. Check if container is running: `docker ps`
3. Test internal connectivity: `docker exec survey_api curl localhost:3000/api/health`

### Production Deployment

For production, consider:

1. **Use a registry**:
   ```bash
   docker tag survey-api your-registry.com/survey-api:latest
   docker push your-registry.com/survey-api:latest
   ```

2. **Use Docker secrets** instead of .env files
3. **Set up log rotation** and monitoring
4. **Configure backup** for container data
5. **Use specific version tags** instead of `latest`

### Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `AZURE_CLIENT_ID` | App registration ID | ✅ |
| `AZURE_CLIENT_SECRET` | App secret value | ✅ |
| `AZURE_TENANT_ID` | Tenant ID (optional) | ❌ |
| `SHAREPOINT_SITE_URL` | SharePoint site URL | ✅ |
| `EXCEL_FILE_PATH` | Path to Excel file | ✅ |
| `WORKSHEET_NAME` | Excel worksheet name | ✅ |
| `NODE_ENV` | Environment (production) | ❌ |
| `PORT` | Application port (3000) | ❌ |