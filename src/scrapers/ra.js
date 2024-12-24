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

    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        console.log(`Scraping: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 5000));

        const events = await page.evaluate(async () => {
            const getEvents = () => {
                const cards = document.querySelectorAll('[data-testid="event-listing-card"]');
                return Array.from(cards).map(card => ({
                    title: card.querySelector('[data-pw-test-id="event-title-link"]')?.innerText,
                    venue: card.querySelector('[data-pw-test-id="event-venue-link"]')?.innerText,
                    artists: card.querySelector('[data-test-id="artists-lineup"]')?.innerText,
                    link: card.querySelector('a')?.href,
                    id: card.querySelector('a')?.href.split('/events/')[1],
                    source: 'ra',
                }));
            };

            let page = 1;
            while (true) {
                const loadMore = document.querySelector(`[data-tracking-id*="page=${page + 1}"]`);
                if (!loadMore) {
                    console.log('No more pages found');
                    break;
                }
                loadMore.click();
                await new Promise(r => setTimeout(r, 2000));
                page++;
            }

            return getEvents();
        });
        return events;
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}
