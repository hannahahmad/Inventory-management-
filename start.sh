#!/usr/bin/env bash

# Navigate to script directory
cd "$(dirname "$0")"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "==================================================================="
    echo " ERROR: Node.js is not installed or not found in system PATH!"
    echo "==================================================================="
    echo " Please install Node.js from https://nodejs.org/"
    echo "==================================================================="
    exit 1
fi

# Run the cross-platform startup orchestrator
node run.js
