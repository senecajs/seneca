import { TaskSpec } from 'ordu';
declare function api_add(this: any): any;
declare function api_message(this: any, pattern0: any, pattern1: any, action: any): any;
declare const task: {
    translate(spec: TaskSpec): {
        op: string;
        out: {
            pattern: any;
        };
    };
    prepare(spec: TaskSpec): {
        op: string;
        out: {
            actdef: any;
            action: any;
            pattern: any;
        };
    };
    plugin(spec: TaskSpec): {
        op: string;
        out: {
            actdef: any;
        };
    };
    callpoint(spec: TaskSpec): {
        op: string;
        out: {
            actdef: any;
        };
    };
    flags(spec: TaskSpec): {
        op: string;
        out: {
            actdef: any;
            strict_add: boolean;
        };
    };
    action(spec: TaskSpec): {
        op: string;
        out: {
            actdef: any;
        };
    };
    prior(spec: TaskSpec): {
        op: string;
        out: {
            actdef: any;
            addroute: boolean;
        };
    };
    rules(spec: TaskSpec): {
        op: string;
        out: {
            actdef: any;
        };
    };
    register(spec: TaskSpec): {
        op: string;
    };
    modify(spec: TaskSpec): {
        op: string;
    };
};
export { api_add, api_message, task, };
