import { TaskSpec } from 'ordu';
import type { ActDef } from './types';
declare function api_add(this: any): any;
declare const task: {
    prepare(spec: TaskSpec): {
        op: string;
        out: {
            actdef: ActDef;
            action: any;
            pattern: any;
        };
    };
    plugin(spec: TaskSpec): {
        op: string;
        out: {
            actdef: ActDef;
        };
    };
    callpoint(spec: TaskSpec): {
        op: string;
        out: {
            actdef: ActDef;
        };
    };
    flags(spec: TaskSpec): {
        op: string;
        out: {
            actdef: ActDef;
            strict_add: boolean;
        };
    };
    action(spec: TaskSpec): {
        op: string;
        out: {
            actdef: ActDef;
        };
    };
    prior(spec: TaskSpec): {
        op: string;
        out: {
            actdef: ActDef;
            addroute: boolean;
        };
    };
    rules(spec: TaskSpec): {
        op: string;
        out: {
            actdef: ActDef;
        };
    };
    register(spec: TaskSpec): {
        op: string;
    };
    modify(spec: TaskSpec): {
        op: string;
    };
};
export { api_add, task, };
