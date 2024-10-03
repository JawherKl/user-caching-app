# User Caching App with Redis and PostgreSQL

This project demonstrates the use of caching to optimize read-heavy operations by using Redis as a cache layer and PostgreSQL as the primary database. The example involves a simple user profile system where user data can be fetched and updated. Redis is used to cache user profiles for faster retrieval.

## Table of Contents
- [Project Setup](#project-setup)
- [API Endpoints](#api-endpoints)
- [How Caching Works](#how-caching-works)
- [Testing with Postman or Curl](#testing-with-postman-or-curl)
- [Troubleshooting](#troubleshooting)

---

## Project Setup

### 1. Prerequisites
Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher)
- **PostgreSQL**
- **Redis**
- **Postman** or **Curl** (for API testing)

### 2. Clone the Project

```bash
git clone https://github.com/your-repo/user-caching-app.git
cd user-caching-app
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure PostgreSQL

#### 1. Create a PostgresSQL database (e.g,userdb):
    ``` sql
        CREATE DATABASE userdb;
    ```

#### 2. Inside the userdb, create a users table:
    ``` sql
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(100)
        );
    ```

#### 3. Insert sample data into the users table:
    ``` sql 
        INSERT INTO users (name, email) VALUES 
        ('John Doe', 'john@example.com'),
        ('Jane Smith', 'jane@example.com');
    ```
#### 4. Update your PostgreSQL credentials in index.js:
    ``` javascript
        const pgPool = new Pool({
            user: 'your_pg_user',
            host: 'localhost',
            database: 'userdb',
            password: 'your_pg_password',
            port: 5432
        });
    ```

### 5. Start Redis
Ensure that Redis is running locally. If Redis is installed, you can start it by running:
    ``` bash
        redis-server
    ```

### 6. Run the Application
Start the Node.js server:
    ``` bash
        node index.js
    ```
the server will start on port 3000.


## API Endpoints

### 1. Fetch User Profile (GET)
Endpoint: 
    ``` bash
        GET /user/:id
    ```
Description: Fetches the user profile by ID. If the user profile is cached, it returns the cached data. Otherwise, it fetches from PostgreSQL, caches the result, and returns it.
    Example Request:
    ``` bash
        curl http://localhost:3000/user/1
    ```
    Example Response (Cache Miss, Fetched from PostgreSQL):

    ``` json
        {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com"
        }
    ```

    Example Response (Cache Hit, Fetched from Redis):

    ``` json
        {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com"
        }
    ```

### 2. Update User Profile (PUT)
Endpoint:
    ``` bash
        PUT /user/:id
    ```

Description: Updates the user profile by ID. After updating the database, it invalidates the cached data for the user.
Example Request:
    ``` bash
        curl -X PUT http://localhost:3000/user/1 -H "Content-Type: application/json" -d '{"name": "John Updated", "email": "johnnew@example.com"}'
    ```

Example Response:
    ``` json
        {
            "id": 1,
            "name": "John Updated",
            "email": "johnnew@example.com"
        }
    ```

## How Caching Works

### 1. Cache Hit

    If a user profile is already cached in Redis, the server returns the cached data, avoiding a PostgreSQL query. This reduces latency and improves performance for repeated read requests.

### 2. Cache Miss

    If the user profile is not found in Redis (cache miss), the server fetches the data from PostgreSQL, caches the result in Redis for 1 hour, and then returns the data.

### 3. Cache Invalidation

    When a user profile is updated, the corresponding cache entry is deleted from Redis. The updated data will be fetched from PostgreSQL and cached again on the next read request.

## Testing with Postman or Curl

### 1. Fetch a User Profile
First request (cache miss, fetched from PostgreSQL):
    ``` bash
        curl http://localhost:3000/user/1
    ```

Second request (cache hit, fetched from Redis):
    ``` bash
        curl http://localhost:3000/user/1
    ```
    
### 2. Update a User Profile
Update the profile for user with ID 1:
    ``` bash
        curl -X PUT http://localhost:3000/user/1 -H "Content-Type: application/json" -d '{"name": "John Updated", "email": "johnnew@example.com"}'
    ```

    The cache will be invalidated, and the profile will be updated in PostgreSQL.

### 3. Fetch Updated Profile
    ``` bash
        curl http://localhost:3000/user/1
    ```

## Troubleshooting
### 1. Redis Client Error: ClientClosedError: The client is closed
This error occurs if the Redis client is used after it has been closed. To resolve this, make sure that the Redis client is properly initialized and connected before usage. Ensure the following in your index.js file:

    ``` javascript
        redisClient.connect().catch(console.error);
    ```

### 2. Redis Connection Issues
Ensure Redis is running locally. You can check Redis status by running:
    ``` bash
        redis-cli ping
    ```
    If Redis is running, the response will be PONG.

### 3. PostgreSQL Connection Issues
Ensure that your PostgreSQL server is running and your database credentials are correct. If you encounter connection errors, verify your database credentials and ensure that PostgreSQL is accessible on localhost:5432.

## License
This project is open-source and available under the MIT License.
    ``` yaml
        ---
        You can now copy and paste this into your `README.md` file. Let me know if any further tweaks are needed!
    ```
