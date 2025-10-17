# Website Exit Intent Survey - nginx Configuration

This document provides nginx configuration for the sophisticated website evaluation system with queue management, resubmission tracking, and SharePoint integration.

## 🔧 Production nginx Configuration

Add these location blocks to your main nginx configuration:

```nginx
# Exit Intent Survey API (Node.js Backend)
location /survey-api {
    set $survey_api survey_api;
    proxy_pass http://$survey_api:3002;
    rewrite ^/survey-api(.*)$ $1 break;
    proxy_redirect            off;
    proxy_set_header          X-Real-IP $remote_addr;
    proxy_set_header          X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header          Host $host;
    proxy_set_header          X-Forwarded-Proto https;
    
    # Increase timeouts for Excel operations
    proxy_connect_timeout     60s;
    proxy_send_timeout        60s;
    proxy_read_timeout        60s;
    
    # Buffer settings for queue management
    proxy_buffering           on;
    proxy_buffer_size         4k;
    proxy_buffers             8 4k;
}

# Exit Intent Survey Static Files (JavaScript Library)
location /survey-web {
    set $survey_web survey_api_web;
    proxy_pass http://$survey_web:3003;
    rewrite ^/survey-web(.*)$ $1 break;
    proxy_redirect            off;
    proxy_set_header          X-Real-IP $remote_addr;
    proxy_set_header          X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header          Host $host;
    proxy_set_header          X-Forwarded-Proto https;
    
    # Cache static assets
    expires                   1d;
    add_header                Cache-Control "public, immutable";
    
    # Enable gzip compression
    gzip                      on;
    gzip_types                application/javascript text/javascript;
}
```

## 🌐 Production URLs

### API Endpoints
- **Survey Submission**: `https://yourdomain.com/survey-api/api/survey`
- **Health Check**: `https://yourdomain.com/survey-api/api/health`
- **Queue Status**: `https://yourdomain.com/survey-api/api/queue-status`
- **Debug Permissions**: `https://yourdomain.com/survey-api/api/debug-permissions`
- **Excel Testing**: `https://yourdomain.com/survey-api/api/debug-excel`

### Static Assets
- **JavaScript Library**: `https://yourdomain.com/survey-web/exit-intent-survey.js`

## 🔗 Website Integration

Add to your website's HTML (e.g., Squarespace Code Injection):

```html
<!-- Website Exit Intent Survey -->
<script src="https://yourdomain.com/survey-web/exit-intent-survey.js"></script>
```

### Configuration
The survey is pre-configured with your API endpoint. No additional JavaScript needed.

## 📊 Monitoring & Debug URLs

For testing and monitoring:

```bash
# Check API health
curl https://yourdomain.com/survey-api/api/health

# Monitor queue status
curl https://yourdomain.com/survey-api/api/queue-status

# Verify permissions (admin only)
curl https://yourdomain.com/survey-api/api/debug-permissions
```

## 🚀 Alternative Deployment Options

### Option 1: GitHub Pages (Recommended for JS)
For better CDN performance and reduced server load:

1. **Create GitHub repository** for static assets
2. **Enable GitHub Pages** in repository settings
3. **Upload** `exit-intent-survey.js` to repository
4. **Update HTML integration**:
   ```html
   <script src="https://yourusername.github.io/survey-static/exit-intent-survey.js"></script>
   ```
5. **Remove survey-web nginx block** (API only needed)

**Benefits**: 
- Global CDN distribution
- Reduced server load
- Better caching
- Higher availability

### Option 2: CDN Integration
For enterprise deployments:

```nginx
# Serve static assets from CDN
location /survey-web {
    return 301 https://cdn.yourdomain.com/survey/exit-intent-survey.js;
}
```

### Option 3: Local File Serving
For maximum control:

```nginx
# Serve static files directly from disk
location /survey-web {
    alias /var/www/survey-static;
    expires 1d;
    add_header Cache-Control "public, immutable";
    gzip on;
    gzip_types application/javascript;
}
```

## ⚡ Performance Optimization

### Rate Limiting (Optional)
To protect against abuse:

```nginx
# Add to http block
limit_req_zone $binary_remote_addr zone=survey_api:10m rate=10r/m;

# Add to survey-api location
location /survey-api {
    limit_req zone=survey_api burst=5 nodelay;
    # ... existing config
}
```

### SSL/TLS Configuration
Ensure HTTPS for security:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server block
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Survey locations here...
}
```

## 🔧 Health Check Configuration

Add health check endpoint for load balancers:

```nginx
# Simple health check
location /survey-health {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}

# Detailed health check (proxy to API)
location /survey-detailed-health {
    proxy_pass http://survey_api:3002/api/health;
    proxy_set_header Host $host;
}
```

## 📝 Complete Example Configuration

```nginx
# Add to your main nginx.conf server block
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # Survey API with performance tuning
    location /survey-api {
        proxy_pass http://survey_api:3002;
        rewrite ^/survey-api(.*)$ $1 break;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        # Timeouts for Excel operations
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Rate limiting (optional)
        limit_req zone=survey_api burst=5 nodelay;
    }
    
    # Survey JavaScript (or redirect to CDN)
    location /survey-web {
        proxy_pass http://survey_api_web:3003;
        rewrite ^/survey-web(.*)$ $1 break;
        
        # Caching
        expires 1d;
        add_header Cache-Control "public, immutable";
        
        # Compression
        gzip on;
        gzip_types application/javascript;
    }
    
    # Health check
    location /survey-health {
        proxy_pass http://survey_api:3002/api/health;
        access_log off;
    }
}
```

## 🛠️ Troubleshooting

### Common Issues

1. **502 Bad Gateway**: Check if containers are running
   ```bash
   docker-compose ps
   ```

2. **Slow responses**: Excel operations can take 1-3 seconds
   - Increase proxy timeouts
   - Monitor queue status at `/survey-api/api/queue-status`

3. **CORS errors**: Ensure proper headers are set
   - Check `X-Forwarded-Proto` header
   - Verify API CORS configuration

4. **Cache issues**: Clear browser cache or add cache-busting
   ```html
   <script src="https://yourdomain.com/survey-web/exit-intent-survey.js?v=2"></script>
   ```

### Testing Commands

```bash
# Test API connectivity
curl -I https://yourdomain.com/survey-api/api/health

# Test JavaScript loading
curl -I https://yourdomain.com/survey-web/exit-intent-survey.js

# Monitor queue (during high traffic)
watch curl -s https://yourdomain.com/survey-api/api/queue-status
```

---

**This configuration supports 12,000+ users/month with queue management, resubmission tracking, and SharePoint integration.**