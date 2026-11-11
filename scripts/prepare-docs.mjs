import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, '.docs-site');
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const repository =
    process.env.GITHUB_REPOSITORY ??
    new URL(manifest.repository.url.replace(/^git\+/, '').replace(/\.git$/, '')).pathname.slice(1);
const ref = process.env.DOCS_REF ?? 'master';
const targets = new Map();
const pages = [];
for (const [language, prefix] of [
    ['eng', ''],
    ['ru', 'ru/'],
    ['zh', 'zh/'],
]) {
    for (const name of (await readdir(join(root, 'docs', language))).filter((name) =>
        name.endsWith('.md'),
    )) {
        const source = join(root, 'docs', language, name);
        const target = `${prefix}${name}`;
        targets.set(source, target);
        pages.push({ source, target });
    }
}
for (const [name, target] of [
    ['README.md', 'index.md'],
    ['README.ru.md', 'ru/index.md'],
    ['README.zh-CN.md', 'zh/index.md'],
    ['THIRD_PARTY_NOTICES.md', 'upstream-notices.md'],
]) {
    const source = join(root, name);
    targets.set(source, target);
    pages.push({ source, target });
}
for (const [name, target] of [
    ['CONTRIBUTING.md', 'contributing.md'],
    ['SECURITY.md', 'security.md'],
    ['ACCESSIBILITY.md', 'accessibility.md'],
    ['CHANGELOG.md', 'changelog.md'],
    ['LICENSE', 'license.md'],
])
    targets.set(join(root, name), target);
await rm(output, { recursive: true, force: true });
await mkdir(join(output, '.vitepress'), { recursive: true });
await writeFile(
    join(output, '.vitepress/config.mts'),
    "export { default } from '../../.vitepress/config.mts';\n",
);
for (const { source, target } of pages) {
    const text = await readFile(source, 'utf8');
    const transformed = text.replace(/\]\(([^\s)]+)\)/g, (match, href) => {
        if (/^[a-z][a-z0-9+.-]*:|^#/i.test(href)) return match;
        const [pathname, fragment] = href.split('#');
        const absolute = resolve(dirname(source), decodeURIComponent(pathname));
        const mapped = targets.get(absolute);
        if (mapped)
            return `](${relative(dirname(target), mapped).split('\\').join('/')}${fragment ? `#${fragment}` : ''})`;
        const sourcePath = relative(root, absolute).split('\\').join('/');
        return `](https://github.com/${repository}/blob/${encodeURIComponent(ref)}/${sourcePath}${fragment ? `#${fragment}` : ''})`;
    });
    const destination = join(output, target);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, transformed);
}
await writeFile(
    join(output, 'license.md'),
    `# MIT License\n\n\`\`\`text\n${await readFile(join(root, 'LICENSE'), 'utf8')}\`\`\`\n`,
);
console.log(`Prepared ${pages.length + 1} documentation pages in .docs-site.`);
