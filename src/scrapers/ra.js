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

export async function scrapeRA() {
    const { start, end } = getDateRange();
    const url = `https://ra.co/events/us/newyorkcity?startDate=${start}&endDate=${end}`;

    let browser;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
        try {
            console.log(`Starting RA scraper attempt ${retryCount + 1}...`);
            browser = await getBrowser();
            console.log('Browser launched successfully');

            const page = await browser.newPage();

            // Configure browser environment
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

            // Random mouse movements before navigation
            await page.mouse.move(Math.random() * 1920, Math.random() * 1080);

            console.log(`Navigating to: ${url}`);
            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: 60000
            });

            // Additional random mouse movement after page load
            await page.mouse.move(Math.random() * 1920, Math.random() * 1080);

            console.log('Page loaded, waiting for content...');

            // Wait for real content with exponential backoff
            const contentTimeout = 30000 * Math.pow(2, retryCount);
            try {
                await page.waitForSelector('[data-testid="event-listing-card"]', {
                    timeout: contentTimeout,
                    visible: true
                });
                console.log('Event cards found on page');
            } catch (error) {
                console.log('Content check failed, analyzing page...');
                const content = await page.content();
                if (content.includes('captcha-delivery')) {
                    throw new Error('Captcha detected');
                }
                throw error;
            }

            // Add random delay before scraping
            await delay(1000 + Math.random() * 2000);

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
                    })).filter(event => event.title && event.venue);
                };

                let currentEvents = getEvents();
                console.log(`Initial events found: ${currentEvents.length}`);

                let page = 1;
                let failedLoadAttempts = 0;
                const maxFailedAttempts = 3;

                while (true) {
                    const loadMore = document.querySelector(`[data-tracking-id*="page=${page + 1}"]`);
                    if (!loadMore) {
                        console.log('No more pages found');
                        break;
                    }

                    try {
                        loadMore.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        loadMore.click();
                        await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
                        page++;
                        failedLoadAttempts = 0;
                    } catch (error) {
                        failedLoadAttempts++;
                        if (failedLoadAttempts >= maxFailedAttempts) {
                            console.log('Max failed load attempts reached');
                            break;
                        }
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }

                return getEvents();
            });

            console.log(`Successfully scraped ${events.length} events from RA`);
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

            // Exponential backoff between retries
            const delay = Math.pow(2, retryCount) * 1000;
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));

        } finally {
            if (browser) {
                await browser.close();
                console.log('Browser closed');
            }
        }
    }
}