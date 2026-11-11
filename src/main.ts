import { startApplication } from '@bootstrap/application';
import { loadConfig } from '@config/env';
import { logMessages } from '@messages/logs';

async function main(): Promise<void> {
    await startApplication(loadConfig());
}
void main().catch((error) => {
    console.error(logMessages.applicationFailed, error);
    process.exitCode = 1;
});
