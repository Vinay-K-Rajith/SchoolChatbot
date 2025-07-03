# 1. Use official Node.js LTS image
FROM node:20-alpine AS builder

# 2. Set working directory
WORKDIR /app

# 3. Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# 4. Copy the rest of the code
COPY . .

# 5. Build the frontend widget (and any other build steps)
RUN npm run build

# 6. Use a smaller image for production
FROM node:20-alpine

WORKDIR /app

# 7. Copy only necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/node_modules ./node_modules

# 8. Expose the port (change if your server uses a different port)
EXPOSE 3000

# 9. Start the server
CMD ["node", "dist/index.js"] 