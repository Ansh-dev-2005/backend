# Backend Assignment

This project is a backend application built with Node.js and Express.js. It includes file upload functionality, API routes for interacting with ClickHouse, and serves static files from the `output` directory.

## Project Structure

```
app.js
package.json
controllers/
    streaming.js
middleware/
    verifyToken.js
models/
    User.js
routes/
    clickhouse.js
    flatfile.js
services/
uploads/
    <uploaded files>
utills/
    clickHouse.js
    uploads.js
```

### Key Files and Directories

- **`app.js`**: Entry point of the application.
- **`routes/`**: Contains route definitions for APIs.
  - `clickhouse.js`: Routes for interacting with ClickHouse.
  - `flatfile.js`: Routes for file-related operations.
- **`utills/uploads.js`**: Handles file uploads using `multer`.
- **`utills/clickHouse.js`**: Utility functions for interacting with ClickHouse.

## Prerequisites

- Node.js (v16 or later)
- npm (v7 or later)

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and configure the following variables:
   ```env
   PORT=3000
   CLICKHOUSE_HOST=<your-clickhouse-host>
   CLICKHOUSE_USER=<your-clickhouse-user>
   CLICKHOUSE_PASSWORD=<your-clickhouse-password>
   JWT_SECRET=<your-jwt-secret>
   ```

## Run Instructions

1. Start the server:
   ```bash
   npm start
   ```

2. The server will run on `http://localhost:3000` by default. You can change the port in the `.env` file.

## API Endpoints

### File Upload
- **POST** `/upload`
  - Uploads a file to the server.

### ClickHouse Operations
- **GET** `/clickhouse/query`
  - Executes a query on ClickHouse.

### Static Files
- Static files are served from the `output` directory.

## Notes

- Ensure that the ClickHouse server is running and accessible.
- Uploaded files are stored in the `uploads/` directory.
- Output files are stored in the `output/` directory.