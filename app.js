const dotenv = require('dotenv')
dotenv.config()

let socketUrl = process.env.WS_ENDPOINT !== undefined ? process.env.WS_ENDPOINT : 'https://ws.retrobox.tech'
let consoleId = process.env.CONSOLE_ID !== undefined ? process.env.CONSOLE_ID : null
let consoleToken = process.env.CONSOLE_TOKEN !== undefined ? process.env.CONSOLE_TOKEN : null

if (!(process.getuid && process.getuid() === 0)) {
    console.log('> ERR: not running as root user')
    process.exit()
}

const Overlay = require('./src/Overlay')
const overlay = new Overlay(socketUrl, consoleId, consoleToken)

overlay.connect()
