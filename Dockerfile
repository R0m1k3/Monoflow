# Node Alpine -- multi-arch (amd64 + arm64)
FROM node:lts-alpine

WORKDIR /app

# wget is needed for Docker healthcheck
RUN apk add --no-cache wget

# Copy package files first for caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project
COPY . .

# Build the project (web only, skip NeutralinoJS desktop build)
RUN npx vite build

# Expose Vite preview port
EXPOSE 4173

# Entrypoint: injects PUBLIC_POCKETBASE_URL into dist/index.html at container startup
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

# Run the built project
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
