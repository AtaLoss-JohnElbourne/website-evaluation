# Static file server for exit-intent-survey.js
FROM nginx:alpine

# Copy the JavaScript file to nginx html directory
COPY exit-intent-survey.js /usr/share/nginx/html/

# Create a simple nginx config for serving static files
RUN echo 'server { \
    listen 3001; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location / { \
        add_header Access-Control-Allow-Origin *; \
        add_header Access-Control-Allow-Methods "GET, OPTIONS"; \
        add_header Access-Control-Allow-Headers "Content-Type"; \
        try_files $uri $uri/ =404; \
    } \
    \
    location /exit-intent-survey.js { \
        add_header Content-Type "application/javascript"; \
        add_header Access-Control-Allow-Origin *; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"]