/* Start of Selection */
import express from 'express';
import path from 'path';
import fs from 'fs';
import * as cheerio from 'cheerio';
import prettier from 'prettier';
import open from 'open';
import puppeteer from 'puppeteer-extra';
import axios from 'axios';
import { ZenRows } from 'zenrows';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { connect } from 'puppeteer-real-browser'




const app = express();
const PORT = 3001;

// List of URLs to scrape
const urls = [
    { home: 'https://jiji.ng/child-care-and-education-services' },
];

const scrapeURLToHtml = async (key, url) => {
    const { browser, page } = await connect({
        headless: false,
        args: [],
        customConfig: {},
        turnstile: true,
        connectOption: {},
        disableXvfb: false,
        ignoreAllFlags: false,
    });
    try {


        console.log('Browser connected, navigating to page...');
        await page.goto(url, {
            waitUntil: ['networkidle0', 'networkidle2'],
            timeout: 800000,


        });
        console.log('Initial page load complete');

        console.log('Setting viewport and fullscreen...');
        await page.setViewport({ width: 1920, height: 1080 });
        await page.evaluate(() => {
            document.documentElement.requestFullscreen();
        });

        await page.setJavaScriptEnabled(true);

        console.log('Capturing page content...');
        const html = await page.content();
        const $ = cheerio.load(html);

        await page.screenshot({ path: 'debug-screenshot.png' });
        console.log('Screenshot saved');

        // ... existing code for extracting styles, CSS variables, and Tailwind classes ...

        const formattedHtml = await prettier.format($.html(), { parser: 'html' });
        const filePath = path.join(process.cwd(), `${key}.html`);
        fs.writeFileSync(filePath, formattedHtml);

        console.log(`Scraped ${url} and saved to ${filePath}`);

        await page.screenshot({ path: 'debug-screenshot.png' });
        console.log('Screenshot saved');
    } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        if (error.message.includes('net::ERR_CERT_DATE_INVALID')) {
            console.warn('Bypassing SSL certificate error. Attempting to navigate to the target page...');
            await page.goto(url, {
                waitUntil: ['networkidle0', 'networkidle2'],
                timeout: 800000,
                ignoreHTTPSErrors: true // Ignore invalid SSL certificates
            });
            console.log('Bypassed SSL error and navigated to the target page.');
        } else {
            console.error('Error details:', error.message); // Added error details logging
        }
        throw error;
    }
};

// Route to serve the home page
app.get('/', async (req, res) => {
    try {
        const homeUrlObject = urls.find(obj => obj.home);
        const homeUrl = homeUrlObject ? homeUrlObject.home : '';
        if (!homeUrl) {
            return res.status(500).send('Home URL not found.');
        }

        await scrapeURLToHtml('home', homeUrl);
        const filePath = path.join(process.cwd(), 'home.html');
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error details:', error.message);
        res.status(500).send('Error scraping the home page. Check the server logs for details.');
    }
});

// Create routes for each page
urls.forEach(urlObject => {
    for (const [key, url] of Object.entries(urlObject)) {
        if (key !== 'home') {
            app.get(`/${key}`, async (req, res) => {
                try {
                    await scrapeURLToHtml(key, url);
                    const filePath = path.join(process.cwd(), `${key}.html`);
                    res.sendFile(filePath);
                } catch (error) {
                    console.error('Error details:', error.message);
                    res.status(500).send('Error scraping the webpage. Check the server logs for details.');
                }
            });
        }
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    open(`http://localhost:${PORT}`);
});
/* End of Selection */
