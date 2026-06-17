# Use a lightweight, official Node.js image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies (use npm ci for strict lockfile installs in production)
RUN npm install

# Copy the rest of the application code
COPY . .

# We don't define a CMD here because we will override it in docker-compose