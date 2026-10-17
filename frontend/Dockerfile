# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definition
COPY package*.json ./

# Install dependencies
RUN npm ci || npm install

# Copy source code
COPY . .

# Build production bundle
RUN npm run build

# Production Stage with Nginx
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Clean default html
RUN rm -rf ./*

# Copy built dist from builder stage
COPY --from=builder /app/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
