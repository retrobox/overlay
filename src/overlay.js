const childProcess = require('child_process')
const io = require('socket.io-client')
const fs = require('fs')

module.exports = class Overlay {
    constructor(socketUrl, consoleId, consoleToken) {
        this.ping = "pong"
        this.consoleId = consoleId
        this.consoleToken = consoleToken
        if (this.consoleId === null || this.consoleToken === null) {
            this.initConfigFile()
        }
        console.log(`> Registered as console: ${this.consoleId}, with token: ${this.consoleToken}`)
        console.log(`> Using websocket url: ${socketUrl}`)
        this.socket = io(socketUrl, {
            transportOptions: {
                polling: {
                    extraHeaders: {
                        'x-client-type': 'console',
                        'x-console-id': this.consoleId,
                        'x-console-token': this.consoleToken
                    }
                }
            }
        });
    }
    connect () {
        this.socket.on('connect', () => {
            console.log('> Connected with websocket server')
            this.socket.on('get-status', (callback) => this.getStatus(callback))
            this.socket.on('shutdown', (callback) => this.shutdown(callback))
            this.socket.on('reboot', (callback) => this.reboot(callback))
            this.socket.on('ping-check', (callback) => this.respondPing(callback))
        });
        this.socket.on('disconnect', () => {
            console.log('> Disconnected from websocket server')
        })
    }
    initConfigFile () {
        let overlayConfigLocation = "/boot/overlay.json"
        console.log('> Using the config file located at ' + overlayConfigLocation)
        if (fs.existsSync(overlayConfigLocation)) {
            let config = fs.readFileSync(overlayConfigLocation)
            try {
                config = JSON.parse(config)
            } catch(err) {
                console.log("> ERR: Invalid overlay config file")
                process.exit()
            }
            if (config.token !== undefined) {
                this.consoleToken = config.token
            }
            if (config.id !== undefined) {
                this.consoleId = config.id
            }
        } else {
            console.log(`> ERR: No overlay config file found at ${overlayConfigLocation}`)
            process.exit()
        }
    }
    respondPing (callback) {
        return callback({isAlive: true})
    }
    async getStatus (callback) {
        let status = {
            cpu_temp: await this.getCpuTemp(),
            gpu_temp: await this.getGpuTemp(),
            up_time: await this.getUpTime(),
            disk: await this.getDiskSpace(),
            wifi: await this.getWifiSsid(),
            ip: await this.getIpAddress(),
            free_mem: await this.getFreeMemory(),
            total_mem: await this.getTotalMemory()
        }
        return callback(status)
    }
    getCpuTemp () {
        return new Promise((resolve, reject) => {
            childProcess.exec('cat /sys/class/thermal/thermal_zone0/temp', (err, stdout, stderr) => {
                if (err || stderr != '') return reject()
                return resolve(parseFloat((parseInt(stdout) / 1000).toFixed(2)))
            })
        })
    }
    getGpuTemp () {
        return new Promise((resolve, reject) => {
            childProcess.exec('vcgencmd measure_temp', (err, stdout, stderr) => {
                if (err || stderr != '') return reject()
                return resolve(parseFloat(stdout.replace('temp=', '').replace("'C")))
            })
        })
    }
    getWifiSsid () {    
        return new Promise((resolve, reject) => {
            childProcess.exec('iwgetid -r', (err, stdout, stderr) => {
                if (err || stderr != '') return reject()
                return resolve(stdout.replace('\n', ''))
            })
        })
    }
    getDiskSpace () {
        return new Promise((resolve, reject) => {
            childProcess.exec('df -h /', (err, stdout, stderr) => {
                if (err || stderr != '') return reject()
                let raw = stdout.split('\n')[1].split(' ').filter(s => s != '')
                let result = {
                    partition: raw[0],
                    size: raw[1],
                    used: raw[2],
                    free: raw[3],
                    usage: raw[4],
                    mountPoint: raw[5]
                }
                return resolve(result)
            })
        })
    }
    getUpTime () {
        return new Promise((resolve, reject) => {
            childProcess.exec('/usr/bin/cut -d. -f1 /proc/uptime', (err, stdout, stderr) => {
                if (err || stderr != '') return reject()
                
                return resolve(parseInt(stdout.replace('\n', '')))
            })
        })
    }
    getIpAddress () {
        return new Promise((resolve, reject) => {
            childProcess.exec("ip route get 8.8.8.8 2>/dev/null | awk '{print $NF; exit}'", (err, stdout, stderr) => {
                if (err || stderr != '') return reject()

                return resolve(stdout.replace('\n', ''))
            })
        })
    }
    getFreeMemory () {
        return new Promise((resolve, reject) => {
            childProcess.exec("grep MemFree /proc/meminfo | awk {'print $2'}", (err, stdout, stderr) => {
                if (err || stderr != '') return reject()

                return resolve(parseInt(stdout.replace('\n', '')))
            })
        })
    }
    getTotalMemory() {
        return new Promise((resolve, reject) => {
            childProcess.exec("grep MemTotal /proc/meminfo | awk {'print $2'}", (err, stdout, stderr) => {
                if (err || stderr != '') return reject()

                return resolve(parseInt(stdout.replace('\n', '')))
            })
        })
    }
    shutdown () {
        return new Promise(resolve => {
            resolve({
                ack: true
            })
            childProcess.exec("poweroff")
        })
    }
    reboot () {
        return new Promise(resolve => {
            resolve({
                ack: true
            })
            childProcess.exec("reboot")
        })
    }
}
