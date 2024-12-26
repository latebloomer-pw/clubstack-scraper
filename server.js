import express from 'express';
import { handler } from './src/index.js';

const app = express();
const port = 3000;

// Track scraping state
let isScrapingInProgress = false;
let lastScrapeTime = null;
let lastScrapeResult = null;

app.get('/status', (req, res) => {
    res.json({
        status: 'online',
        isScrapingInProgress,
        lastScrapeTime,
        uptime: process.uptime()
    });
});

app.post('/scrape', async (req, res) => {
    if (isScrapingInProgress) {
        return res.status(409).json({
            error: 'Scrape already in progress',
            startedAt: lastScrapeTime
        });
    }

    try {
        isScrapingInProgress = true;
        lastScrapeTime = new Date();

        const result = await handler();
        lastScrapeResult = JSON.parse(result.body);

        res.json({
            status: 'success',
            startedAt: lastScrapeTime,
            completedAt: new Date(),
            events: lastScrapeResult
        });
    } catch (error) {
        console.error('Scrape failed:', error);
        res.status(500).json({
            error: 'Scrape failed',
            message: error.message
        });
    } finally {
        isScrapingInProgress = false;
    }
});

app.get('/last-result', (req, res) => {
    if (!lastScrapeResult) {
        return res.status(404).json({
            error: 'No scrape results available'
        });
    }
    res.json(lastScrapeResult);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});