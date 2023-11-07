import Nid from 'nid';
import { Patrun, Gex } from 'patrun';
declare function init(seneca_options?: any, more_options?: any): any;
declare namespace init {
    var Seneca: (this: any) => void;
    var loghandler: any;
    var use: () => any;
    var test: () => any;
    var quiet: () => any;
    var util: {
        Eraro: any;
        Jsonic: any;
        Nid: typeof Nid;
        Patrun: typeof Patrun;
        Gex: typeof Gex;
        Gubu: any;
        clean: any;
        pattern: any;
        print: any;
        error: any;
        deep: any;
        deepextend: any;
        parsepattern: any;
        pincanon: any;
        router: () => any;
        resolve_option: any;
        argprops: any;
        recurse: any;
        copydata: any;
        nil: any;
        flatten: any;
    };
    var valid: any;
    var test$: {
        intern: {
            util: {
                Eraro: any;
                Jsonic: any;
                Nid: typeof Nid;
                Patrun: typeof Patrun;
                Gex: typeof Gex;
                Gubu: any;
                clean: any;
                pattern: any;
                print: any;
                error: any;
                deep: any;
                deepextend: any;
                parsepattern: any;
                pincanon: any;
                router: () => any;
                resolve_option: any;
                argprops: any;
                recurse: any;
                copydata: any;
                nil: any;
                flatten: any;
            };
        };
    };
}
type Instance = ReturnType<typeof make_seneca> & Record<string, any>;
export type { Instance };
export default init;
declare function make_seneca(initial_opts?: any): any;
