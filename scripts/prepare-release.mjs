import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const manifest = JSON.parse(await readFile('package.json', 'utf8'));
if (
    process.env.GITHUB_REF_TYPE === 'tag' &&
    process.env.GITHUB_REF_NAME !== `v${manifest.version}`
) {
    throw new Error('Release tag must match package.json version.');
}
const output = '.release';
const staging = join(output, 'app');
await rm(output, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
const files = [
    'dist',
    'src',
    'tests',
    'docs',
    'scripts',
    'migrations',
    '.vitepress',
    '.github',
    'init.sql',
    'Dockerfile',
    'docker-compose.yml',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'tsconfig.build.json',
    'tsconfig.site.json',
    'eslint.config.js',
    '.prettierrc.json',
    '.gitignore',
    '.dockerignore',
    '.env.example',
    'LICENSE',
    'CONTRIBUTING.md',
    'SECURITY.md',
    'ACCESSIBILITY.md',
    'CHANGELOG.md',
    'README.md',
    'README.ru.md',
    'README.zh-CN.md',
];
for (const file of files) await cp(file, join(staging, file), { recursive: true });
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run with npm run release:prepare.');
execFileSync(process.execPath, [npm, 'ci', '--omit=dev'], { cwd: staging, stdio: 'inherit' });
execFileSync(process.execPath, [npm, 'run', 'docs:notices', '--', '--production'], {
    cwd: staging,
    stdio: 'inherit',
});
const sbom = execFileSync(
    process.execPath,
    [npm, 'sbom', '--omit=dev', '--package-lock-only', '--sbom-format=cyclonedx'],
    { cwd: staging },
);
await writeFile(join(output, 'sbom.cdx.json'), sbom);
execFileSync('tar', [
    '--exclude=node_modules',
    '-czf',
    join(output, `${manifest.name}-${manifest.version}.tar.gz`),
    '-C',
    output,
    'app',
]);
const assets = (await readdir(output))
    .filter((file) => file.endsWith('.tar.gz') || file.endsWith('.json'))
    .sort();
const sums = await Promise.all(
    assets.map(
        async (file) =>
            `${createHash('sha256')
                .update(await readFile(join(output, file)))
                .digest('hex')}  ${file}`,
    ),
);
await writeFile(join(output, 'SHA256SUMS'), sums.join('\n') + '\n');
console.log(`Prepared release ${manifest.version}: ${assets.join(', ')}, SHA256SUMS.`);
