import { getBrowser } from '../utils/browser.js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

function getDateRange() {
    const start = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { start, end };
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function scrapeDice() {
    const { start, end } = getDateRange();
    const url = `https://dice.fm/browse/new-york?from=${start}&until=${end}`;

    let browser;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
        try {
            console.log(`Starting Dice scraper attempt ${retryCount + 1}...`);
            browser = await getBrowser();
            console.log('Browser launched successfully');

            const page = await browser.newPage();

            await page.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"'
            });

            await page.setViewport({
                width: 1920,
                height: 1080
            });

            console.log(`Navigating to: ${url}`);
            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: 60000
            });

            console.log('Page loaded, waiting for content...');

            await page.waitForSelector('[class*="EventCard"]', {
                timeout: 30000,
                visible: true
            });
            console.log('Event cards found on page');

            await delay(1000 + Math.random() * 2000);

            const events = await page.evaluate(async () => {
                const getEvents = () => {
                    const cards = document.querySelectorAll('[class*="EventCard"]');
                    const seen = new Map();

                    Array.from(cards).forEach(card => {
                        const title = card.querySelector('[class*="Title"]')?.innerText;
                        if (!title) return;

                        const event = {
                            title,
                            date: card.querySelector('[class*="DateText"]')?.innerText,
                            venue: card.querySelector('[class*="Venue"]')?.innerText,
                            price: card.querySelector('[class*="Price"]')?.innerText,
                            link: card.closest('a')?.href,
                            source: 'dice',
                        };

                        // Only add if we have required fields and haven't seen this event before
                        if (event.title && event.venue && (!seen.has(title) || !seen.get(title).link)) {
                            seen.set(title, event);
                        }
                    });

                    return Array.from(seen.values());
                };

                let events = getEvents();
                console.log(`Initial events found: ${events.length}`);

                let previousLength = 0;
                let unchangedCount = 0;
                const maxUnchangedAttempts = 3;

                while (true) {
                    const loadMore = document.querySelector('[class*="LoadMoreRow"] button');
                    if (!loadMore || !loadMore.offsetParent) {
                        console.log('No more load button visible');
                        break;
                    }

                    try {
                        loadMore.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        loadMore.click();
                        await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));

                        events = getEvents();

                        if (events.length === previousLength) {
                            unchangedCount++;
                            if (unchangedCount >= maxUnchangedAttempts) {
                                console.log('No new events after multiple attempts');
                                break;
                            }
                        } else {
                            unchangedCount = 0;
                        }

                        previousLength = events.length;
                        console.log(`Current event count: ${events.length}`);

                    } catch (error) {
                        console.log('Error loading more events:', error);
                        break;
                    }
                }

                return getEvents();
            });

            console.log(`Successfully scraped ${events.length} events from Dice`);
            return events;

        } catch (error) {
            console.error('Scraping error:', {
                attempt: retryCount + 1,
                message: error.message,
                stack: error.stack,
                phase: browser ? 'page_operations' : 'browser_launch',
                url: url
            });

            retryCount++;
            if (retryCount >= maxRetries) {
                throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
            }

            const retryDelay = Math.pow(2, retryCount) * 1000;
            console.log(`Retrying in ${retryDelay}ms...`);
            await delay(retryDelay);

        } finally {
            if (browser) {
                await browser.close();
                console.log('Browser closed');
            }
        }
    }
}