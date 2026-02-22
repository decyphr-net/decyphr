#!/bin/sh
set -e

echo "Running database migrations..."
npm run migration:run

echo "Starting flashcards service..."
npm run start:prod
