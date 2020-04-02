const pty = require('node-pty')

module.exports = class TerminalSession {
    constructor(socket) {
        this.token = ""
        this.socket = socket
        this.pty = null
        this.outputEnabled = false
    }

    openSession() {
        return new Promise((resolve) => {
            if (this.pty !== null) {
                this.pty.removeAllListeners('data')
                this.pty.removeAllListeners('exit')
            }

            this.outputEnabled = true

            this.pty = pty.spawn('su', ['-', 'pi'], {
                name: 'xterm-color',
                cols: 80,
                rows: 30,
                cwd: '/home/pi',
                env: process.env
            });

            this.pty.on('data', (data) => {
                if (!this.outputEnabled) {
                    this.socket.emit('terminal-output', data)
                } else {
                    this.outputEnabled = false
                }
            })

            this.pty.on('exit', (exitCode, signal) => {
                console.log('> Terminal: Process exited with code', exitCode, 'and signal', signal)
                this.socket.emit('terminal-exit', {exitCode, signal})
            })

            resolve()
        })
    }

    write(data) {
        this.pty.write(data)
    }

    close() {
        this.pty.kill()
    }

    resize(data) {
        this.pty.resize(data.cols, data.rows)
    }
}

