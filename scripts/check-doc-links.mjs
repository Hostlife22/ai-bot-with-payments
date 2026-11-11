import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const languages = ['ru', 'eng', 'zh'];
const files = [
    'README.md',
    'README.ru.md',
    'README.zh-CN.md',
    'CONTRIBUTING.md',
    'SECURITY.md',
    'ACCESSIBILITY.md',
    'CHANGELOG.md',
    'THIRD_PARTY_NOTICES.md',
    ...readdirSync(join(root, 'docs'), { recursive: true })
        .filter((name) => name.endsWith('.md'))
        .map((name) => join('docs', name)),
];

function prose(text) {
    let fence;
    return text
        .split(/\r?\n/)
        .filter((line) => {
            const opening = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
            if (!fence && opening) {
                fence = opening[1];
                return false;
            }
            if (fence) {
                if (new RegExp(`^\\s{0,3}${fence[0]}{${fence.length},}\\s*$`).test(line)) {
                    fence = undefined;
                }
                return false;
            }
            return true;
        })
        .join('\n');
}

const anchors = new Map();

function headings(file) {
    if (anchors.has(file)) {
        return anchors.get(file);
    }
    const used = new Map();
    const result = new Set();
    for (const match of prose(readFileSync(file, 'utf8')).matchAll(/^#{1,6}\s+(.+)$/gm)) {
        const base = match[1]
            .trim()
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, '')
            .replace(/\s/g, '-');
        const count = used.get(base) ?? 0;
        used.set(base, count + 1);
        result.add(count ? `${base}-${count}` : base);
    }
    anchors.set(file, result);
    return result;
}

const failures = [];
let count = 0;

for (const name of files) {
    const file = join(root, name);
    if (!existsSync(file)) {
        failures.push(`${name}: missing document`);
        continue;
    }
    for (const match of prose(readFileSync(file, 'utf8')).matchAll(/\]\(([^\s)]+)\)/g)) {
        const target = match[1];
        if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
            continue;
        }
        const [pathname, fragment] = target.split('#');
        const destination = pathname ? resolve(dirname(file), decodeURIComponent(pathname)) : file;
        const location = relative(root, destination);
        count++;
        if (location === '..' || location.startsWith(`..${sep}`) || !existsSync(destination)) {
            failures.push(`${name}: missing local target ${target}`);
            continue;
        }
        if (
            fragment &&
            destination.endsWith('.md') &&
            statSync(destination).isFile() &&
            !headings(destination).has(decodeURIComponent(fragment))
        ) {
            failures.push(`${name}: missing heading ${target}`);
        }
    }
}

const expected = readdirSync(join(root, 'docs/eng'))
    .filter((name) => name.endsWith('.md'))
    .sort();

for (const language of languages) {
    const actual = readdirSync(join(root, 'docs', language))
        .filter((name) => name.endsWith('.md'))
        .sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
        failures.push(`docs/${language}: document set differs from docs/eng`);
    }
}

if (failures.length) {
    for (const failure of failures) {
        console.error(failure);
    }
    process.exitCode = 1;
} else {
    console.log(
        `Documentation links passed: ${count} local links; ${expected.length} documents per language.`,
    );
}
