const dotenv = require('dotenv')
dotenv.config()

let socketUrl = process.env.SOCKET_URL !== undefined ? process.env.SOCKET_URL : 'https://ws.retrobox.tech'
let consoleId = process.env.CONSOLE_ID !== undefined ? process.env.CONSOLE_ID : null
let consoleToken = process.env.CONSOLE_TOKEN !== undefined ? process.env.CONSOLE_TOKEN : null

if (!(process.getuid && process.getuid() === 0)) {
    console.log('> ERR: not running as root user')
    process.exit(1)
}

process
  .on('unhandledRejection', (reason, p) => {
    console.error(reason, 'Unhandled Rejection at Promise', p);
    process.exit(1);
  })
  .on('uncaughtException', err => {
    console.error(err, 'Uncaught Exception thrown');
    process.exit(1);
  });

const Overlay = require('./src/Overlay')
const overlay = new Overlay(socketUrl, consoleId, consoleToken)

overlay.connect()
