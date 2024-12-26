import { getBrowser } from '../utils/browser.js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

function getDateRange() {
    const start = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { start, end };
}


export async function scrapeRA() {
    const { start, end } = getDateRange();
    const url = `https://ra.co/events/us/newyorkcity?startDate=${start}&endDate=${end}`;

    let browser;
    try {
        console.log('Starting RA scraper...');
        browser = await getBrowser();
        console.log('Browser launched successfully');

        const page = await browser.newPage();
        console.log(`Navigating to: ${url}`);

        // Add timeout and log page load status
        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        console.log('Page loaded successfully');

        // Log page content for debugging
        const content = await page.content();
        console.log('Page content length:', content.length);
        console.log('First 500 chars:', content.substring(0, 500));

        // Log selector presence
        const cardCount = await page.$$eval('[data-testid="event-listing-card"]', elements => elements.length);
        console.log(`Found ${cardCount} event cards`);

        const events = await page.evaluate(async () => {
            // ... rest of your existing evaluate code ...
        });

        console.log(`Successfully scraped ${events.length} events`);
        return events;
    } catch (error) {
        console.error('Detailed scraping error:', {
            message: error.message,
            stack: error.stack,
            phase: browser ? 'page_operations' : 'browser_launch',
            url: url
        });
        throw error;
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed');
        }
    }
}
