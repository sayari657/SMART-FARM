# Stage 1 — Build the React app
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .

# VITE_API_URL is intentionally left empty here so the built JS uses
# relative /api/v1 paths. nginx then proxies those to the backend container.
# Override at build-time if you need an absolute URL:
#   docker build --build-arg VITE_API_URL=https://api.yourdomain.com/api/v1 .
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2 — Serve with nginx
FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
