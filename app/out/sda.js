const axios = require("axios");

function validateAKey(event, serviceUrl, data) {
    const url = "https://www.{0}/api/sda-client/validate_akey".format(serviceUrl);

    axios.post(url, data).then((response) => {
        event.sender.send('validateAKeyResponse', response.data);
    });
}

exports.validateAKey = validateAKey;