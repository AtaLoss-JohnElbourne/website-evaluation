@echo off
REM Test Runner Script for Windows
REM Run different types of tests for the survey API

echo 🧪 Survey API Test Suite
echo ========================

REM Check if Docker is available
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed or not in PATH
    exit /b 1
)

REM Parse command line arguments
if "%1"=="" (
    echo 📋 Running all tests...
    npm test
    goto end
)

if "%1"=="unit" (
    echo 🏃 Running unit tests...
    npm run test:unit
    goto end
)

if "%1"=="integration" (
    echo 🏃 Running integration tests...
    npm run test:integration
    goto end
)

if "%1"=="coverage" (
    echo 🏃 Running tests with coverage...
    npm run test:coverage
    goto end
)

if "%1"=="docker" (
    echo 🐳 Running tests in Docker...
    docker compose -f docker-compose.test.yml up --build survey-api-test
    goto end
)

if "%1"=="docker-coverage" (
    echo 🐳 Running tests with coverage in Docker...
    docker compose -f docker-compose.test.yml up --build survey-api-test-coverage
    goto end
)

if "%1"=="contracts" (
    echo 🏃 Running contract tests...
    npm run test:contracts
    goto end
)

if "%1"=="docker-contracts" (
    echo 🐳 Running contract tests in Docker...
    docker compose -f docker-compose.test.yml up --build survey-api-test-contracts
    goto end
)

if "%1"=="all" (
    echo 🏃 Running all tests...
    npm test
    goto end
)

echo ❌ Unknown test type: %1
echo Available options: unit, integration, contracts, coverage, docker, docker-coverage, docker-contracts, all
exit /b 1

:end
echo ✅ Test run completed!