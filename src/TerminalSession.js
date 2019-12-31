const pty = require('node-pty')

module.exports = class TerminalSession {
    constructor(socket) {
        this.token = ""
        this.socket = socket
        this.pty = null
    }

    openSession() {
        this.pty = pty.spawn('bash', [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: '/home/pi',
            env: process.env
        });

        this.pty.on('data', data => {
            this.socket.emit('terminal-output', data)
        });
    }

    write(data) {
        this.pty.write(data)
    }

    close() {
        this.pty.kill()
    }

    resize(data) {
        console.log(data)
        this.pty.resize(data.cols, data.rows)
    }
}

