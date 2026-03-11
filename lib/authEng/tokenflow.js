const axios = require("axios");
const crypto = require("crypto");

function isValid(cookieData) {
    const age = Date.now() - cookieData.tokenDate;
    return age < 1000 * 60 * 60 * 12; // 12h
}

async function getAccessToken(refreshToken) {
    const res = await axios.post("https://api.amazon.com/auth/token", {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: "amzn1.application-oa2-client.xxxxx",
        client_secret: "xxxxx"
    }, {
        headers: { "Content-Type": "application/json" }
    });

    return res.data.access_token;
}

function buildLoginCookie(accessToken) {
    return `at-accesstoken=${accessToken}; Domain=.amazon.com; Path=/; Secure; HttpOnly;`;
}

async function getLocalCookie(loginCookie, region) {
    const res = await axios.get(`https://${region}/api/bootstrap`, {
        headers: { Cookie: loginCookie }
    });

    return res.headers["set-cookie"].join("; ");
}

async function getCSRF(localCookie, region) {
    const res = await axios.get(`https://${region}/api/bootstrap`, {
        headers: { Cookie: localCookie }
    });

    return res.headers["csrf-token"];
}

function buildDeviceInfo(stored) {
    return {
        frc: stored?.cookieData?.frc || crypto.randomBytes(16).toString("base64"),
        mapMd: stored?.cookieData?.["map-md"] || crypto.randomBytes(32).toString("base64"),
        deviceId: stored?.cookieData?.deviceId || crypto.randomBytes(8).toString("hex"),
        deviceSerial: stored?.cookieData?.deviceSerial || crypto.randomBytes(16).toString("hex"),
        macDms: stored?.cookieData?.macDms || {}
    };
}

async function createSession(refreshToken, stored) {
    const region = stored?.cookieData?.amazonPage || "amazon.de";

    const accessToken = await getAccessToken(refreshToken);
    const loginCookie = buildLoginCookie(accessToken);
    const localCookie = await getLocalCookie(loginCookie, region);
    const csrf = await getCSRF(localCookie, region);

    const dev = buildDeviceInfo(stored);

    return {
        loginCookie,
        frc: dev.frc,
        "map-md": dev.mapMd,
        deviceId: dev.deviceId,
        deviceSerial: dev.deviceSerial,
        refreshToken,
        tokenDate: Date.now(),
        amazonPage: region,
        localCookie,
        csrf,
        macDms: dev.macDms,
        deviceAppName: "NodeRED Alexa2",
        dataVersion: 2
    };
}

module.exports = {
    isValid,
    createSession
};
