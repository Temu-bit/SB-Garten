import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
        page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

        await page.goto('http://localhost:8080');
        await new Promise(r => setTimeout(r, 3000)); // wait for loads
        
        await browser.close();
    } catch (e) {
        console.error("Puppeteer error:", e);
    }
})();
