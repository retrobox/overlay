let socketUrl = process.env.SOCKET_URL !== undefined ? process.env.SOCKET_URL : 'https://ws.retrobox.tech'
let consoleId = process.env.CONSOLE_ID !== undefined ? process.env.CONSOLE_ID : null
let consoleToken = process.env.CONSOLE_TOKEN !== undefined ? process.env.CONSOLE_TOKEN : null

if (!(process.getuid && process.getuid() === 0)) {
    console.log('> ERR: not running as root user')
    process.exit()
}

const Overlay = require('./src/overlay')
const overlay = new Overlay(socketUrl, consoleId, consoleToken)

overlay.connect()
