const AlexaRemote = require("alexa-remote2");
const storage = require("./storage");

class AlexaAuthEngine {
    constructor(node, config) {
        this.node = node;
        this.config = config;
        // WICHTIG: die node Alexa-Instanz verwenden
        //this.alexa = new AlexaRemote();
        this.alexa = node.alexa;
    }

    async init() {
        const stored = storage.load(this.node);

        const cookieData = stored?.storedCookie || null;
        const refreshToken = stored?.storedToken?.refreshToken || null;

        // Wenn wir gültige cookieData + refreshToken haben → Token-Modus
        if (cookieData && refreshToken) {
            this.node.warn("TOKEN: Verwende gespeicherte Session");
            return await this.loginWithCookie(cookieData);
        }

        // Sonst Proxy-Login
        this.node.warn("TOKEN: Keine gespeicherte Session → Proxy-Login");
        return await this.loginWithProxy();
    }

    async loginWithCookie(cookieData) {
        return new Promise((resolve, reject) => {
            this.alexa.initExt(
                {
                    cookie: cookieData,              // WICHTIG: komplettes cookieData-Objekt
                    amazonPage: this.config.amazonPage || "amazon.de",
                    logger: this.node.log.bind(this.node),
                    usePushConnection: true,
                    setupProxy: false,
                    proxyOnly: false
                },
                null,                // proxyWaitCallback
                (err) => {
                    if (err) {
                        this.node.warn("TOKEN: Cookie ungültig → Proxy-Login");
                        return this.loginWithProxy().then(resolve).catch(reject);
                    }

                    // alexa-remote2 hat cookieData evtl. erneuert
                    const newCookie = this.alexa.cookieData;
                    const newRefresh = newCookie?.refreshToken || null;

                    storage.save(this.node, newCookie, newRefresh);

                    this.node.warn("TOKEN: Cookie-Login erfolgreich");
                    resolve(newCookie);
                }
            );
        });
    }

    async loginWithProxy() {
        return new Promise((resolve, reject) => {
            this.alexa.initExt(
                {
                    proxyOnly: true,
                    proxyOwnIp: this.config.proxyOwnIp,
                    proxyPort: this.config.proxyPort,
                    proxyListenBind: this.config.proxyListenBind,
                    amazonPage: this.config.amazonPage || "amazon.de",
                    logger: this.node.log.bind(this.node)
                },
                null,                // proxyWaitCallback
                (err) => {
                    if (err) return reject(err);

                    const cookieData = this.alexa.cookieData;
                    const refreshToken = cookieData?.refreshToken || null;

                    storage.save(this.node, cookieData, refreshToken);

                    this.node.warn("TOKEN: Proxy-Login erfolgreich");
                    resolve(cookieData);
                }
            );
        });
    }
}

module.exports = AlexaAuthEngine;
