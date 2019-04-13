const childProcess = require('child_process')
const wifi = require('node-wifi')
const io = require('socket.io-client')

module.exports = class Overlay {
    constructor(socketUrl, consoleId) {
        this.socket = io(socketUrl, {
            transportOptions: {
                polling: {
                    extraHeaders: {
                        'x-client-type': 'console',
                        'x-console-id': consoleId
                    }
                }
            }
        });
    }
    init () {
        wifi.init({
            iface: null
        });
        this.socket.on('connect', function () {
            this.socket.on('get-status', getStatus);
            this.socket.on('get-wifi', getWifi)
        });
    }
    getStatus (callback) {
        status = {isAlive: true}
        this.getTemp().then(temp => {
            status.temp = temp
            return callback(status)
        })
    }
    getWifi (callback) {    
        wifi.getCurrentConnections((err, currentConnections) => {
            if (err) {
                console.log(err)
                return;
            } else {
                callback(currentConnections[0])
            }
        })        
    }
    getTemp () {
        return new Promise((resolve, reject) => {
            // cat /sys/class/thermal/thermal_zone0/temp

            childProcess.exec('vcgencmd measure_temp', (err, stdout, stderr) => {
                if (err && stderr != '') {
                    return reject()
                }
                return resolve(parseFloat(stdout.replace('temp=', '').replace("'C")))
            })
        })
    }
    getDiskSpace () {
        // df -h /
        return new Promise((resolve, reject) => {

        })
    }
}
/// TYPE SCRIPT ?