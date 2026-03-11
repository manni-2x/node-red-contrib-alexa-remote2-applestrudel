const fs = require("fs");

function load(node) {
    try {
        const storedCookie = JSON.parse(fs.readFileSync(node.cookieFile));
        const storedToken  = JSON.parse(fs.readFileSync(node.tokenFile));

        return {
            storedCookie,
            storedToken
        };
    } catch {
        return null;
    }
}

function save(node, cookieData, refreshToken) {
    fs.writeFileSync(node.cookieFile, JSON.stringify(cookieData, null, 2));
    fs.writeFileSync(
        node.tokenFile,
        JSON.stringify(
            {
                refreshToken,
                tokenDate: cookieData.tokenDate
            },
            null,
            2
        )
    );
}

module.exports = { load, save };
