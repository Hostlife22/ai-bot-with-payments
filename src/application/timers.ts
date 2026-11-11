export class Timers {
    private readonly handles = new Set<NodeJS.Timeout>();
    private readonly active = new Set<Promise<unknown>>();
    private closed = false;
    private run(task: () => void | Promise<unknown>): Promise<unknown> {
        const promise = Promise.resolve()
            .then(task)
            .catch((error) => console.error('Scheduled task failed', error));
        this.active.add(promise);
        void promise.finally(() => this.active.delete(promise));
        return promise;
    }
    every(task: () => void | Promise<void>, milliseconds: number): NodeJS.Timeout {
        if (this.closed) throw new Error('Scheduler is closed');
        let running = false;
        const handle = setInterval(() => {
            if (running || this.closed) return;
            running = true;
            void this.run(task).finally(() => {
                running = false;
            });
        }, milliseconds);
        this.handles.add(handle);
        return handle;
    }
    after(task: () => void | Promise<unknown>, milliseconds: number): NodeJS.Timeout {
        if (this.closed) throw new Error('Scheduler is closed');
        const handle = setTimeout(() => {
            this.handles.delete(handle);
            if (!this.closed) void this.run(task);
        }, milliseconds);
        this.handles.add(handle);
        return handle;
    }
    cancel(handle: NodeJS.Timeout): void {
        clearTimeout(handle);
        this.handles.delete(handle);
    }
    async close(): Promise<void> {
        this.closed = true;
        for (const handle of this.handles) clearTimeout(handle);
        this.handles.clear();
        await Promise.allSettled(this.active);
    }
}
