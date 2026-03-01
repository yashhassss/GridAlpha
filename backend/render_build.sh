#!/usr/bin/env bash

# This script runs during Render deployment to bootstrap the database.
echo "Starting Render Deployment Script..."

echo "1. Checking database connection..."
python -c "
import os
import psycopg2
from urllib.parse import urlparse

url = os.getenv('DATABASE_URL')
if not url:
    print('Error: DATABASE_URL is not set!')
    exit(1)

print('Database URL found. Attempting connection...')
try:
    conn = psycopg2.connect(url)
    conn.close()
    print('Successfully connected to the PostgreSQL database!')
except Exception as e:
    print(f'Database connection failed: {e}')
    exit(1)
"

# Exit on Python failure
if [ $? -ne 0 ]; then
  exit 1
fi

echo "2. Initializing Database Schema (database.py)..."
python database.py

echo "3. Seeding Initial Data (seed_db.py)..."
# We only want to seed if the database is empty. seed_db.py should handle this safely.
python seed_db.py

echo "Deployment Script Completed Successfully!"
