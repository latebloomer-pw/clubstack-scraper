import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export async function getBrowser() {
    return await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--window-size=1920,1080']
    });
}