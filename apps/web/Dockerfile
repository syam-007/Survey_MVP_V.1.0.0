# Use Node.js 20 as base image
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install
COPY package*.json ./
# RUN npm install

# Copy project files and build
COPY . .
# RUN npm run build   # <-- production build output (e.g., ./dist)

# Stage 2: Nginx to serve files
FROM nginx:latest
COPY --from=builder /app/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]