const childProcess = require('child_process')
const io = require('socket.io-client')

module.exports = class Overlay {
    constructor(socketUrl, consoleId) {
        this.ping = "pong"
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
        this.socket.on('connect', () => {
            console.log('Connected with websocket server')
            this.socket.on('get-status', (callback) => this.getStatus(callback))
        });
    }
    async getStatus (callback) {
        let status = {
            cpu_temp: await this.getCpuTemp(),
            gpu_temp: await this.getGpuTemp(),
            uptime: await this.getUptime(),
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
                if (err && stderr != '') return reject()
                return resolve(parseFloat((parseInt(stdout) / 1000).toFixed(2)))
            })
        })
    }
    getGpuTemp () {
        return new Promise((resolve, reject) => {
            childProcess.exec('vcgencmd measure_temp', (err, stdout, stderr) => {
                if (err && stderr != '') return reject()
                return resolve(parseFloat(stdout.replace('temp=', '').replace("'C")))
            })
        })
    }
    getWifiSsid () {    
        return new Promise((resolve, reject) => {
            childProcess.exec('iwgetid -r', (err, stdout, stderr) => {
                if (err && stderr != '') return reject()
                return resolve(stdout.replace('\n', ''))
            })
        })
    }
    getDiskSpace () {
        return new Promise((resolve, reject) => {
            childProcess.exec('df -h /', (err, stdout, stderr) => {
                if (err && stderr != '') return reject()
                let raw = stdout.split('\n')[1].split(' ').filter(s => s != '')
                let result = {
                    partition: raw[0],
                    size: raw[1],
                    used: raw[2],
                    availaible: raw[3],
                    usage: raw[4],
                    mountPoint: raw[5]
                }
                return resolve(result)
            })
        })
    }
    getUptime () {
        return new Promise((resolve, reject) => {
            childProcess.exec('/usr/bin/cut -d. -f1 /proc/uptime', (err, stdout, stderr) => {
                if (err && stderr != '') return reject()
                
                return resolve(parseInt(stdout.replace('\n', '')))
            })
        })
    }
    getIpAddress () {
        return new Promise((resolve, reject) => {
            childProcess.exec("ip route get 8.8.8.8 2>/dev/null | awk '{print $NF; exit}'", (err, stdout, stderr) => {
                if (err && stderr != '') return reject()

                return resolve(stdout.replace('\n', ''))
            })
        })
    }
    getFreeMemory () {
        return new Promise((resolve, reject) => {
            childProcess.exec("grep MemFree /proc/meminfo | awk {'print $2'}", (err, stdout, stderr) => {
                if (err && stderr != '') return reject()

                return resolve(parseInt(stdout.replace('\n', '')))
            })
        })
    }
    getTotalMemory() {
        return new Promise((resolve, reject) => {
            childProcess.exec("grep MemTotal /proc/meminfo | awk {'print $2'}", (err, stdout, stderr) => {
                if (err && stderr != '') return reject()

                return resolve(parseInt(stdout.replace('\n', '')))
            })
        })
    }
}
