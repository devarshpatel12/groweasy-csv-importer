#!/bin/sh
set -e

node backend/dist/index.js &
BACKEND_PID=$!

cd frontend && npm start &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM

wait
