import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { HeadConfig, UserConfig } from 'vitepress';

export function createSeoConfig(
    repository: string,
    translatedPages: readonly string[],
): Pick<UserConfig, 'head' | 'transformHead' | 'sitemap' | 'buildEnd'> {
    const [owner, name] = repository.split('/');
    const siteUrl = new URL(
        process.env.DOCS_SITE_URL ?? `https://${owner?.toLowerCase()}.github.io/${name}/`,
    );
    if (!siteUrl.pathname.endsWith('/')) {
        throw new Error('DOCS_SITE_URL must end with /.');
    }
    const locales = [
        { prefix: '', language: 'en', openGraph: 'en_US' },
        { prefix: 'ru/', language: 'ru', openGraph: 'ru_RU' },
        { prefix: 'zh/', language: 'zh-CN', openGraph: 'zh_CN' },
    ];

    const pageUrl = (path: string): string =>
        new URL(path.replace(/\.md$/, '').replace(/(^|\/)index$/, '$1'), siteUrl).href;

    return {
        head: [
            ['meta', { name: 'author', content: 'Hostlife22' }],
            ['meta', { name: 'theme-color', content: '#3e63dd' }],
        ],
        sitemap: {
            hostname: siteUrl.href,
            transformItems: (items) => items.filter((item) => !item.url.includes('404')),
        },

        transformHead: ({ pageData, title, description }): HeadConfig[] => {
            const path = pageData.relativePath;
            if (path === '404.md') {
                return [['meta', { name: 'robots', content: 'noindex,follow' }]];
            }
            const canonical = pageUrl(path);
            const locale =
                locales.find((item) => item.prefix && path.startsWith(item.prefix)) ?? locales[0];
            const tags: HeadConfig[] = [
                ['link', { rel: 'canonical', href: canonical }],
                ['meta', { name: 'robots', content: 'index,follow' }],
                ['meta', { property: 'og:type', content: 'website' }],
                ['meta', { property: 'og:site_name', content: 'AI Bot with Payments' }],
                ['meta', { property: 'og:title', content: title }],
                ['meta', { property: 'og:description', content: description }],
                ['meta', { property: 'og:url', content: canonical }],
                ['meta', { property: 'og:locale', content: locale?.openGraph ?? 'en_US' }],
                ['meta', { name: 'twitter:card', content: 'summary' }],
                ['meta', { name: 'twitter:title', content: title }],
                ['meta', { name: 'twitter:description', content: description }],
            ];
            const page = path.replace(/^(?:ru|zh)\//, '');
            if (page === 'index.md' || translatedPages.some((name) => `${name}.md` === page)) {
                for (const alternative of locales) {
                    tags.push([
                        'link',
                        {
                            rel: 'alternate',
                            hreflang: alternative.language,
                            href: pageUrl(alternative.prefix + page),
                        },
                    ]);
                }
                tags.push([
                    'link',
                    { rel: 'alternate', hreflang: 'x-default', href: pageUrl(page) },
                ]);
            }
            return tags;
        },

        async buildEnd(config) {
            await writeFile(
                join(config.outDir, 'robots.txt'),
                `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', siteUrl).href}\n`,
            );
        },
    };
}
