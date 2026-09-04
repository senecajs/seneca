declare function api_prior(this: any): any;
declare function api_direct_prior(this: any): any;
declare const Prior: {
    api_prior: typeof api_prior;
    api_direct_prior: typeof api_direct_prior;
};
export { Prior };
