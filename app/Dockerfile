# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Install debugging tools (curl and jq)
RUN apk add --no-cache curl jq

# Create a non-root user first
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set the working directory and ensure nodejs user owns it
WORKDIR /usr/src/app
RUN chown nodejs:nodejs /usr/src/app

# Copy package.json and package-lock.json with correct ownership
COPY --chown=nodejs:nodejs package*.json ./

# Switch to nodejs user before npm install
USER nodejs

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the application code with correct ownership
COPY --chown=nodejs:nodejs . .

# Expose the port the app runs on
EXPOSE 3000

# Define environment variable
ENV NODE_ENV=production

# Command to run the application
CMD ["node", "server.js"]