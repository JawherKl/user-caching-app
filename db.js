const { Pool } = require('pg');

// PostgreSQL setup
const pgPool = new Pool({
    user: 'test2',
    host: '172.20.0.18',
    database: 'userdb',
    password: 'test',
    port: 5432,
});

async function getUserByEmail(email) {
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return result;
    } catch (error) {
        console.error('Error fetching user by email:', error);
        throw error;
    }
}

// Fetch paginated users
async function fetchPaginatedUsers(limit, offset) {
    try {
        const { rows: users } = await pgPool.query(
            'SELECT * FROM users ORDER BY id LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        return users;
    } catch (error) {
        console.error('Error fetching users from PostgreSQL:', error);
        throw error;
    }
}

// Update a user by ID
async function updateUser(id, name, email) {
    try {
        await pgPool.query(
            'UPDATE users SET name = $1, email = $2 WHERE id = $3',
            [name, email, id]
        );
    } catch (error) {
        console.error('Error updating user in PostgreSQL:', error);
        throw error;
    }
}

// Get User By Id
async function getUser(userId) {
    try {
        const result = await pgPool.query(
            'SELECT * FROM users WHERE id = $1', 
            [userId]
        ); 
        return result; 
    } catch (error) {
        console.error('Error fetching user from PostgreSQL:', error);
        throw error;
    }
}
// Search users by name or email
async function searchUsers(query) {
    try {
        const { rows: users } = await pgPool.query(
            'SELECT * FROM users WHERE name ILIKE $1 OR email ILIKE $2',
            [`%${query}%`, `%${query}%`]
        );
        return users;
    } catch (error) {
        console.error('Error searching users in PostgreSQL:', error);
        throw error;
    }
}

async function createUser(name, email) {
    // Simulating database insertion
    // Replace this with your actual database logic
    const newUser = { id: Date.now(), name, email };
    console.log(`Creating user: ${JSON.stringify(newUser)}`);
    return newUser;
}

module.exports = {
    getUserByEmail,
    fetchPaginatedUsers,
    updateUser,
    getUser,
    searchUsers,
    createUser
};