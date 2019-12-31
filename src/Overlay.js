const childProcess = require('child_process')
const io = require('socket.io-client')
const fs = require('fs')
const TerminalSession = require('./TerminalSession')

module.exports = class Overlay {
    constructor(socketUrl, consoleId, consoleToken) {
        this.ping = "pong"
        this.consoleId = consoleId
        this.consoleToken = consoleToken
        this.terminalSession = null
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

    connect() {
        this.socket.on('connect', () => {
            this.socket.on('get-status', (callback) => this.getStatus(callback))
            this.socket.on('shutdown', (callback) => this.shutdown(callback))
            this.socket.on('reboot', (callback) => this.reboot(callback))
            this.socket.on('open-terminal-session', (callback) => this.openTerminalSession(callback))
            this.socket.on('terminal-input', (data) => this.terminalData(data))
            this.socket.on('terminal-resize', (data) => this.terminalResize(data))
            this.socket.on('close-terminal-session', () => this.closeTerminalSession())
            this.socket.on('ping-check', (callback) => this.respondPing(callback))
            console.log('> Connected with websocket server')
        });
        this.socket.on('disconnect', () => {
            console.log('> Disconnected from websocket server')
        })
    }

    initConfigFile() {
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

    respondPing(callback) {
        return callback({isAlive: true})
    }

    async getStatus(callback) {
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

    getCpuTemp() {
        return new Promise((resolve, reject) => {
            childProcess.exec('cat /sys/class/thermal/thermal_zone0/temp', (err, stdout, stderr) => {
                if (err || stderr != '') return reject()
                return resolve(parseFloat((parseInt(stdout) / 1000).toFixed(2)))
            })
        })
    }

    getGpuTemp() {
        return new Promise((resolve, reject) => {
            childProcess.exec('vcgencmd measure_temp', (err, stdout, stderr) => {
                if (err || stderr != '') return reject()
                return resolve(parseFloat(stdout.replace('temp=', '').replace("'C")))
            })
        })
    }

    getWifiSsid() {    
        return new Promise((resolve, reject) => {
            childProcess.exec('iwgetid -r', (err, stdout, stderr) => {
                if (err || stderr != '') return reject()
                return resolve(stdout.replace('\n', ''))
            })
        })
    }

    getDiskSpace() {
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

    async openTerminalSession(callback) {
        console.log('> Terminal: Opening a terminal session...')
        this.terminalSession = new TerminalSession(this.socket)
        this.terminalSession.openSession()

        callback({ ack: true })
    }

    async terminalData(data) {
        if (this.terminalSession !== null) {
            this.terminalSession.write(data)
        } else {
            console.log('> ERR: Received terminal input, but no session is opened')
        }
    }

    async terminalResize(data) {
        if (this.terminalSession !== null) {
            this.terminalSession.resize(data)
        } else {
            console.log('> ERR: Received terminal resize, but no session is opened')
        }
    }

    async closeTerminalSession() {
        if (this.terminalSession === null) {
            console.log('> Terminal session is already closed')
        } else {
            this.terminalSession.close()
            this.terminalSession = null
        }
    }

    async shutdown(callback) {
        callback({ack: true})
        setTimeout(() => {
            childProcess.execSync('poweroff')
        }, 200)
    }

    async reboot(callback) {
        callback({ack: true})
        setTimeout(() => {
            childProcess.execSync('reboot')
        }, 200)
    }
}
