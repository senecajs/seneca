declare type MakeSeneca = (() => Instance) & {
    use: any;
    test: any;
    quiet: any;
    util: any;
    valid: any;
    test$: any;
};
interface Instance extends Record<string, any> {
    version: string;
    id: string;
    did: string;
    fixedargs: any;
    fixedmeta: any;
    start_time: number;
}
export type { MakeSeneca, Instance, };
