const cron = require('node-cron');
const { fetchPaginatedUsers } = require('./db');
const { setToCache } = require('./cache');

// Schedule a cron job to run every 10 minutes to cache the first page of users
cron.schedule('*/10 * * * *', async () => {
    const limit = 10;
    const page = 1;
    const offset = (page - 1) * limit;
    const cacheKey = `users:page:${page}:limit:${limit}`;

    try {
        const users = await fetchPaginatedUsers(limit, offset);
        await setToCache(cacheKey, users);
        console.log('Pre-cached the first page of users');
    } catch (error) {
        console.error('Error in background caching job:', error);
    }
});
