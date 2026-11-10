# ---- Stage 1: Build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# VITE_API_BASE_URL is injected at build time (set it in Render / Railway env vars)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Support React Router (all routes → index.html) + Security & Anti-Cache Headers
RUN printf 'server {\n  listen 80;\n  server_tokens off;\n  root /usr/share/nginx/html;\n  index index.html;\n  add_header X-Frame-Options "DENY" always;\n  add_header X-Content-Type-Options "nosniff" always;\n  add_header X-XSS-Protection "1; mode=block" always;\n  add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n  add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
