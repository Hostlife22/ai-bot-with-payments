import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

import { chromium } from '@playwright/test';

const base = process.env.DOCS_BASE ?? '/';
const origin = 'http://127.0.0.1:4173';
const [owner, repository] = (
    process.env.GITHUB_REPOSITORY ?? 'Hostlife22/ai-bot-with-payments'
).split('/');
const siteUrl =
    process.env.DOCS_SITE_URL ?? `https://${owner.toLowerCase()}.github.io/${repository}/`;
const server = spawn(
    process.execPath,
    [
        'node_modules/vitepress/bin/vitepress.js',
        'preview',
        '.docs-site',
        '--host',
        '127.0.0.1',
        '--port',
        '4173',
    ],
    { stdio: 'inherit' },
);
let browser;
try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
        if (server.exitCode !== null) throw new Error('Documentation preview exited.');
        try {
            ready = (await fetch(origin + base)).ok;
        } catch {
            /* Wait for preview startup. */
        }
        if (ready) break;
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert(ready, 'Documentation preview did not start.');
    const sitemap = await (await fetch(origin + base + 'sitemap.xml')).text();
    assert(sitemap.includes(new URL('ru/configuration', siteUrl).href));
    assert(!sitemap.includes('404.html'));
    const robots = await (await fetch(origin + base + 'robots.txt')).text();
    assert(robots.includes(`Sitemap: ${new URL('sitemap.xml', siteUrl).href}`));
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await mkdir('test-results', { recursive: true });
    for (const [prefix, lang] of [
        ['', 'en'],
        ['ru/', 'ru'],
        ['zh/', 'zh-CN'],
    ]) {
        const response = await page.goto(origin + base + prefix);
        assert.equal(response.status(), 200);
        assert.equal(await page.locator('html').getAttribute('lang'), lang);
        await page.locator('main h1').waitFor();
        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
        assert.equal(canonical, new URL(prefix, siteUrl).href);
        assert.equal(
            await page.locator('link[hreflang="zh-CN"]').getAttribute('href'),
            new URL('zh/', siteUrl).href,
        );
        assert(await page.locator('meta[property="og:title"]').getAttribute('content'));
        assert(await page.locator('meta[name="twitter:description"]').getAttribute('content'));
        await page.locator('.VPSidebar a[href$="configuration"]').first().click();
        await page.waitForURL('**/configuration');
        await page.locator('main h1').waitFor();
    }
    await page.goto(origin + base + 'architecture');
    await page.locator('main svg').first().waitFor();
    await page.screenshot({ path: 'test-results/docs-desktop.png', fullPage: true });
    await page.locator('.DocSearch-Button, .VPNavBarSearch button').first().click();
    const search = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    await search.fill('configuration');
    await page.locator('.VPLocalSearchBox .result').first().waitFor();
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + base + 'ru/');
    assert(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        'Mobile page overflows horizontally.',
    );
    await page.locator('.VPNavBarHamburger').click();
    await page.locator('.VPNavScreen').waitFor({ state: 'visible' });
    await page.screenshot({ path: 'test-results/docs-mobile.png', fullPage: true });
    assert.deepEqual(errors, [], 'Browser JavaScript errors.');
    console.log(
        'Documentation browser checks passed: three locales, navigation, diagrams, search, mobile menu.',
    );
} finally {
    await browser?.close();
    server.kill('SIGTERM');
}
