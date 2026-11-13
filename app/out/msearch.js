(function() {
    "use strict";

    class MSearch {
        constructor(dgram, request, os) {
            this._dgram = dgram;
            this._request = request;
            this._os = os;
            this.searchString =
                'M-SEARCH * HTTP/1.1\r\n' +
                'HOST: 239.255.255.250:1900\r\n' +
                'MAN: "ssdp:discover"\r\n' +
                'MX: 3\r\n' +
                'ST: urn:gira-de:device:Device:1\r\n';
            this.ipPattern = /(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/;

            this.sockets = {};
        }

        _createSocketsForEachInterface() {
            const interfaces = this._os.networkInterfaces();
            this.sockets = {};
            for (var i in interfaces) {
                for (var j in interfaces[i]) {
                    var address = interfaces[i][j];
                    if (address.family === 'IPv4' && !address.internal) {
                        this.sockets[address.address] = this._dgram.createSocket({type: "udp4", reuseAddr: true});
                    }
                }
            }
        }

        _start(event) {
            this._createSocketsForEachInterface();
            Object.keys(this.sockets).forEach((networkInterface) => {
                let socket = this.sockets[networkInterface];

                socket.on('listening', () => {
                    socket.send(this.searchString, 0, this.searchString.length, 1900, '239.255.255.250');
                });

                socket.on('message', (message) => {
                    let response = message.toString();
                    if(this._isGiraDevice(response)) {
                        // call the location of the response to get the xml file.
                        this._getAdditionalInfoFromLocation(response, (result) => {
                            if(result.location !== undefined) {
                                event.sender.send('msearch-reply', this.ipPattern.exec(result.location)[0]);
                                return;
                            }
                        });
                    } else {
                        socket.send(this.searchString, 0, this.searchString.length, 1900, '239.255.255.250');
                    }
                });

                //port is 0 to have the os to select a port by itself
                socket.bind(0, networkInterface, () => {
                    socket.setBroadcast(true);
                    socket.setMulticastTTL(4);
                    try {
                        socket.addMembership("239.255.255.250", networkInterface);
                    } catch (error) {
                        socket.close();
                    }
                });
            });
        }

        _getAdditionalInfoFromLocation(mResponse, callback) {
            let url = "";
            const regEx = RegExp("LOCATION: (.*)");
            let rxResp = regEx.exec(mResponse);

            if(regEx.test(mResponse)) {
                url = rxResp[1];

                this._request(url, (error, response, body) => {
                    if(this._isVisuDevice(body)) {
                        callback({
                            location: rxResp[1]
                        });
                    }
                });

                return;
            }
        }

        _isGiraDevice(response) {
            return response.indexOf("ST: urn:gira-de:device:Device:1") >= 0;
        }

        _isVisuDevice(result) {
            const pattern = RegExp("<capabilities>(.*)</capabilities>");
            const visuPattern = /.*Visu\.*/;
            const capabilities = pattern.exec(result);

            if(pattern.test(result)) {
                if(capabilities[1] === "") {
                    return this._isXOne(result);
                }

                return visuPattern.test(capabilities[1]);
            }

            return false;
        }

        _isXOne(result) {
            const modelNumberPattern = /<modelNumber>(.*)<\/modelNumber>/g;
            const x1ModelNumber = "GIGSRVKX02";
            const modelNumber = modelNumberPattern.exec(result)[1];

            return modelNumber !== "" && modelNumber.indexOf(x1ModelNumber) >= 0;
        }

        startSearch(event) {
            this._start(event);
        }

        stopSearch() {
            try {
                Object.keys(this.sockets).forEach((networkInterface) => {
                    let socket = this.sockets[networkInterface];
                    socket.close();
                    delete this.sockets[networkInterface];
                });
            } catch(e) {
                console.log("Socket allready closed");
            }
        }
    }

    exports.createMSearch = () => {
        const dgram = require("dgram");
        const request = require("request");
        const os = require('os');

        return new MSearch(dgram, request, os);
    };

    exports.MSearch = MSearch;
}());