FROM node:20-alpine

WORKDIR /app

# Install dependencies first for Docker caching
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Run migrations, seed, and start the server automatically
CMD ["npm", "run", "start:init"]
