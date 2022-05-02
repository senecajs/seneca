declare function reply(this: any, spec: any): boolean;
declare function listen(this: any, callpoint: any): (this: any, ...argsarr: any[]) => any;
declare function client(this: any, callpoint: any): (this: any) => any;
declare function init(seneca: any): void;
declare let Transport: {
    reply: typeof reply;
    listen: typeof listen;
    client: typeof client;
    init: typeof init;
    intern: any;
};
export { Transport };
