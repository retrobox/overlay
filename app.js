let socketUrl = process.env.SOCKET_URL !== undefined ? process.env.SOCKET_URL : 'http://localhost:3008'
let consoleId = process.env.CONSOLE_ID !== undefined ? process.env.CONSOLE_ID : 'CONSOLE1'

console.log("I'm " + consoleId)

const Overlay = require('./src/overlay')
const overlay = new Overlay(socketUrl, consoleId)

overlay.init()