#!/bin/bash

# Test Runner Script
# Run different types of tests for the survey API

set -e

echo "🧪 Survey API Test Suite"
echo "========================"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# Function to run tests
run_tests() {
    local test_type=$1
    echo "🏃 Running $test_type tests..."
    
    case $test_type in
        "unit")
            npm run test:unit
            ;;
        "integration")
            npm run test:integration
            ;;
        "coverage")
            npm run test:coverage
            ;;
        "docker")
            echo "🐳 Running tests in Docker..."
            docker compose -f docker-compose.test.yml up --build survey-api-test
            ;;
        "docker-coverage")
            echo "🐳 Running tests with coverage in Docker..."
            docker compose -f docker-compose.test.yml up --build survey-api-test-coverage
            ;;
        "all")
            npm test
            ;;
        *)
            echo "❌ Unknown test type: $test_type"
            echo "Available options: unit, integration, coverage, docker, docker-coverage, all"
            exit 1
            ;;
    esac
}

# Parse command line arguments
if [ $# -eq 0 ]; then
    echo "📋 Running all tests..."
    run_tests "all"
else
    run_tests $1
fi

echo "✅ Test run completed!"