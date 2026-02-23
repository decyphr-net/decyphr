#!/bin/sh
set -e

echo "Running courses migrations..."
npm run migration:run

echo "Starting courses service..."
npm run start:prod
