let socketUrl = process.env.SOCKET_URL !== undefined ? process.env.SOCKET_URL : 'http://localhost:3008'
let consoleId = process.env.CONSOLE_ID !== undefined ? process.env.CONSOLE_ID : 'CONSOLE1'

console.log("I'm " + consoleId)

const io = require('socket.io-client')
const wifi = require('node-wifi')
wifi.init({
    iface: null
});
const socket = io(socketUrl, {
    transportOptions: {
        polling: {
            extraHeaders: {
                'x-client-type': 'console',
                'x-console-id': consoleId
            }
        }
    }
});



socket.on('connect', function () {
    socket.on('get-status', function (callback) {
        callback({temp: 56.8})
    });
    socket.on('get-wifi', function (callback) {
        wifi.getCurrentConnections((err, currentConnections) => {
            if (err) {
                console.log(err);
            }
            callback(currentConnections[0].ssid)
        });
    })
});