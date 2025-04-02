#!/bin/bash
# Script to start the server with localhost configuration
# This helps avoid the ENOTSUP error on Windows systems

# Set environment variables
export NODE_ENV=development

# Start the server using the tsx compiler
npx tsx server/index.ts