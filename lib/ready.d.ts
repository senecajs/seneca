declare function make_ready(root: any): {
    api_ready: typeof api_ready;
    clear_ready: typeof clear_ready;
    execute_ready: typeof execute_ready;
};
declare function api_ready(this: any, ready_func: any): any;
declare function clear_ready(this: any): void;
declare function execute_ready(instance: any, ready_func: any): void;
export { make_ready };
