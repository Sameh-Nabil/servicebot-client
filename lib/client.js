import request from 'request';
import Bluebird from 'bluebird';
//import User from './user';


export default class Client {
    constructor(...args) {
        if (args.length === 2) {
            this.usernamePart = args[0];
            this.passwordPart = args[1];
        } else if (args.length === 1) {
            if (args[0].token) {
                this.usernamePart = args[0].token;
                this.passwordPart = '';
            } else {
                this.usernamePart = args[0].appId;
                this.passwordPart = args[0].appApiKey;
            }
        }
        if (!this.usernamePart || this.passwordPart === undefined) {
            throw new Error('Could not construct a client with those parameters');
        }
        //this.users = new User(this);

        this.promises = false;
        this.baseUrl = 'https://api.intercom.io';
    }
    usePromises() {
        this.promises = true;
        return this;
    }
    useBaseUrl(baseUrl) {
        this.baseUrl = baseUrl;
        return this;
    }
    promiseProxy(f, args) {
        if (this.promises || !f) {
            const callbackHandler = this.callback;
            return new Bluebird((resolve, reject) => {
                const resolver = (err, data) => {
                    if (err) {
                        reject(new Error(JSON.stringify(err)));
                    } else {
                        resolve(data);
                    }
                };
                this.request(args, (_, r) => {
                    callbackHandler(resolver, r);
                });
            });
        } else {
            this.request(args, (_, r) => this.callback(f, r));
        }
    }
    ping(f) {
        this.request({
            uri: '/admins'
        }, (_, response) => f(response.statusCode));
    }
    put(endpoint, data, f) {
        return this.promiseProxy(f,
            {
                method: 'put',
                uri: endpoint,
                body: data
            }
        );
    }
    post(endpoint, data, f) {
        return this.promiseProxy(f,
            {
                method: 'post',
                uri: endpoint,
                body: data
            }
        );
    }
    get(endpoint, data, f) {
        return this.promiseProxy(f,
            {
                method: 'get',
                uri: endpoint,
                qs: data
            }
        );
    }
    nextPage(paginationObject, f) {
        return this.promiseProxy(f,
            {
                method: 'get',
                uri: paginationObject.next,
                baseUrl: null
            }
        );
    }
    delete(endpoint, data, f) {
        return this.promiseProxy(f,
            {
                method: 'delete',
                uri: endpoint,
                qs: data
            }
        );
    }
    request(args, callback) {
        const defaultArgs = {
            baseUrl: this.baseUrl,
            json: true,
            headers: {
                Accept: 'application/json',
                'User-Agent': 'intercom-node-client/2.0.0'
            }
        };

        return request(
            Object.assign({}, defaultArgs, args),
            callback
        ).auth(this.usernamePart, this.passwordPart);
    }
    callback(f, data) {
        if (!f) {
            return;
        }
        if (f.length >= 2) {
            const hasErrors = data.error || (data.body && data.body.type === 'error.list');
            if (hasErrors) {
                f(data, null);
            } else {
                f(null, data);
            }
        } else {
            f(data);
        }
    }
}