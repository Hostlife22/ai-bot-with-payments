import { startApplication } from '@bootstrap/application';
import { loadConfig } from '@config/env';

async function main(): Promise<void> {
    await startApplication(loadConfig());
}
void main().catch((error) => {
    console.error('Application failed', error);
    process.exitCode = 1;
});
