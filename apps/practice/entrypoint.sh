#!/bin/sh
set -e

echo "Running practice migrations..."
npm run migration:run

echo "Starting practice service..."
npm run start:prod
