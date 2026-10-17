type Instance = {
    log?: {
        warn: (entry: Record<string, unknown>) => void;
    };
    options?: () => {
        debug?: {
            deprecation?: boolean;
        };
    };
};
declare function track(instance: Instance): void;
declare function deprecate(instance: Instance | null | undefined, code: string, values?: Record<string, unknown>, key?: string): void;
declare function deprecated<F extends (this: any, ...args: any[]) => any>(code: string, fn: F): F;
declare function reset(): void;
declare const Deprecate: {
    deprecate: typeof deprecate;
    deprecated: typeof deprecated;
    track: typeof track;
    reset: typeof reset;
};
export { Deprecate };
