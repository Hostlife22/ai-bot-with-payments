import type { Repository } from './repositories.js';

export interface DatabaseRepository extends Repository {
    initialize(): Promise<void>;
}
