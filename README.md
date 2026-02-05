# Automation Dashboard

A full-stack automation testing dashboard with Visual, Functional, Security, and Load Testing capabilities.

## Features

- **Visual Testing** - Screenshot comparison and visual regression testing
- **Functional Testing** - Playwright-based automated testing
- **Load Testing** - Performance testing with k6
- **Security Testing** - SAST, DAST, and SCA scanning

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS
- **Backend:** Express.js, Node.js
- **Testing:** Playwright, k6

## Prerequisites

- Node.js >= 18.0.0
- npm

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/harsha1789/Dashboard-Consolidated.git
   cd Dashboard-Consolidated
   ```

2. Install all dependencies:
   ```bash
   npm run install:all
   ```

## Running the Dashboard

### Development Mode

Run both the server and client with hot-reload:
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:3000`
- Frontend dev server on `http://localhost:5173`

### Production Mode

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm start
   ```

The dashboard will be available at `http://localhost:3000`

## Project Structure

```
├── client2/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── functional/     # Functional testing components
│   │   │   ├── loadtesting/    # Load testing components
│   │   │   ├── security/       # Security testing components
│   │   │   └── visual/         # Visual testing components
│   │   └── ...
│   └── ...
├── server/           # Express.js backend
│   ├── routes/       # API routes
│   ├── services/     # Business logic
│   └── server.js     # Entry point
├── tests/            # E2E test files
├── loadtest/         # k6 load testing scripts
└── docs/             # Documentation
```

## License

MIT
