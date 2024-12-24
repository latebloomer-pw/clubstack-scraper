import { getBrowser } from '../utils/browser.js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

function getDateRange() {
    const start = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { start, end };
}

export async function scrapeDice() {
    const { start, end } = getDateRange();
    const url = `https://dice.fm/browse/new-york?from=${start}&until=${end}`;

    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        console.log(`Scraping: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 5000));

        const events = await page.evaluate(async () => {
            const getEvents = () => {
                const cards = document.querySelectorAll('[class*="EventCard"]');
                const seen = new Map();

                Array.from(cards).forEach(card => {
                    const title = card.querySelector('[class*="Title"]')?.innerText;
                    const event = {
                        title,
                        date: card.querySelector('[class*="DateText"]')?.innerText,
                        venue: card.querySelector('[class*="Venue"]')?.innerText,
                        price: card.querySelector('[class*="Price"]')?.innerText,
                        link: card.closest('a')?.href,
                        source: 'dice',
                    };

                    if (!seen.has(title) || !seen.get(title).link) {
                        seen.set(title, event);
                    }
                });

                return Array.from(seen.values());
            };

            while (true) {
                const loadMore = document.querySelector('[class*="LoadMoreRow"] button');
                if (!loadMore) break;
                loadMore.click();
                await new Promise(r => setTimeout(r, 2000));
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
