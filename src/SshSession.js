const fs = require('fs')
const childProcess = require('child_process')
const localtunnel = require('localtunnel')
const { kill } = require('cross-port-killer')

module.exports = class SshSession {
    constructor() {
        this.token = ""
        this.gottyOpened = false
        this.tunnel = null
    }

    installGotty() {
        return new Promise(resolve => {
            this.downloadGotty().then(() => {
                this.extractGotty().then(() => {
                    this.verifyGotty().then(() => {
                        return resolve()
                    })
                })
            })
        })
    }

    killGotty() {
        return kill(8989);
        return new Promise((resolve, reject) => {
            
            // childProcess.exec('netstat -lutnp | grep -w 8989', (err, stdout, stderr) => {
            //     if (err || stderr != '') {
            //         console.log(err, stderr)
            //         if (err !== null && err.code === 1) {
            //             return resolve()
            //         }
            //         console.log("> ERR: can't fetch process using port with netstat and grep")
            //         return reject()
            //     }
            //     console.log(stdout)
            //     if (stdout === '\n') {
            //         return resolve()
            //     }
            //     let uidMatch = /([0-9]+)\/.\/gotty/gm.exec(stdout)
            //     if (uidMatch === null) {
            //         return resolve()
            //     }
            //     let uid = uidMatch[1]
            //     childProcess.exec('kill ' + uid, (err, stderr) => {
            //         if (err || stderr != '') {
            //             console.log("> ERR: can't kill process with uid " + uid)
            //             console.log(err, stderr)
            //             return reject()
            //         }
            //         console.log('> SSH: killed process with uid ' + uid)
            //         return resolve()
            //     })
            // })
        })
    }

    openSession() {
        return new Promise((resolve, reject) => {
            const password = Math.random().toString(36).substring(2)
            if (this.tunnel !== null) {
                this.tunnel.close()
                this.tunnel = null
            }
            this.killGotty().then(pids => {
                console.log('pids killed' , pids)
                let cmd = `-a 127.0.0.1 -p 8989 -w -r --reconnect --max-connection 1 su pi` //-c user:${password}
                console.log('> SSH: trying to start gotty session')
                let gotty = childProcess.spawn('./gotty', cmd.split(' '))
                gotty.stdout.on('data', (data) => {
                    console.log(data.toString())
                });
                gotty.stderr.on('data', (data) => {
                    // WTF gotty is talking in the stderr ???
                    data = data.toString()
                    if (!this.gottyOpened) {
                        let done = false
                        data.split("\n").forEach(line => {
                            if (line.replace('URL: http://127.0.0.1:8989', '') != line && !done) {
                                done = true
                                this.gottyOpened = true
                                let split = line.split('/')
                                let token = split[split.length - 2]
                                console.log('> SSH: Gotty service started')
                                setTimeout(() => {
                                    console.log('> SSH: trying to start local tunnel')
                                    localtunnel({ port: 8989 }).then(tunnel => {
                                        tunnel.on('err', err => {
                                            console.log('> ERR: Local tunnel fail')
                                            console.log(err)
                                        });
                                        tunnel.on('close', () => {
                                            console.log('> SSH: Local tunnel closed')
                                            this.tunnel = false 
                                            return reject()
                                        });

                                        console.log('> SSH: Generating url...')
                                        this.tunnel = tunnel
                                        let url = tunnel.url
                                        //let url = tunnel.url.replace('://', '://user:' + password + '@')
                                        url = url + '/' + token
                                        console.log('> SSH: Tunnel started on ' + url)
                                        resolve(url)
                                    })
                                }, 300)
                            }
                        })
                    }
                });
                gotty.on('close', (code) => {
                    console.log("> ERR: gotty exited")
                    console.log(code)
                    if (this.tunnel !== null) {
                        this.tunnel.close()
                        this.tunnel = null
                    }
                    return reject()
                });
    
            })

            // checkport sudo netstat -nlp | grep :80

        })
    }

    downloadGotty() {
        const releaseUrl = 'https://github.com/yudai/gotty/releases/download/v1.0.1/gotty_linux_arm.tar.gz'
        const sha256 = 'b8d2832260e7f9c3a13d2114025fef3c8db2590426ac4a96fa264bfba7fc9345'
        return new Promise((resolve, reject) => {
            if (!fs.existsSync('./gotty_linux_arm.tar.gz')) {
                console.log('> SSH: starting donwload of gotty release')
                childProcess.exec('wget ' + releaseUrl, (err, stdout, stderr) => {
                    if (err || stderr != '') {
                        console.log("> ERR: can't download gotty release using wget")
                        console.log(err, stderr)
                        return reject()
                    }
                    if (fs.existsSync('./gotty_linux_arm.tar.gz')) {
                        childProcess.exec('sha256sum gotty_linux_arm.tar.gz', (err, stdout, stderr) => {
                            if (err || stderr != '') {
                                console.log("> ERR: can't check gotty release hash")
                                console.log(err, stderr)
                                return reject()
                            }
                            if (!stdout.toString().startsWith(sha256 + '  gotty_linux_arm.tar.gz')) {
                                console.log('> ERR: download getty release, hash not verified')
                                console.log('>      expected: ' + sha256)
                                console.log('>      received: ' + stdout.replace(' ', '').replace('gotty_linux_arm.tar.gz', ''))
                                return reject()
                            }
                            console.log('> SSH: gotty tar.gz release downloaded')
                            return resolve()
                        })
                    } else {
                        console.log("> ERR: getty release download failed, can't locate the archive")
                        return reject()
                    }
                })
            } else {
                console.log("> SSH: gotty_linux_arm.tar.gz already exists")
                return resolve()
            }
        })
    }

    extractGotty() {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync('./gotty')) {
                if (fs.existsSync('./gotty_linux_arm.tar.gz')) {
                    childProcess.exec('tar -xf gotty_linux_arm.tar.gz', (err, stdout, stderr) => {
                        if (err || stderr != '') {
                            console.log("> ERR: can't extract using tar -xf")
                            console.log(err, stderr)
                            return reject()
                        }
                        if (fs.existsSync('./gotty')) {
                            console.log('> SSH: gotty tar.gz release extracted')
                            return resolve()
                        } else {
                            console.log("> ERR: gotty binary extraction failed, can't locate the binary")
                            return reject()
                        }
                    })
                } else {
                    console.log("> ERR: getty release don't exist")
                    return reject()
                }
            } else {
                console.log("> SSH: gotty binary already exists")
                return resolve()
            }
        })
    }

    verifyGotty() {
        return new Promise((resolve, reject) => {
            childProcess.exec('./gotty --version', (err, stdout, stderr) => {
                if (stdout.startsWith("gotty version 1.0.1")) {
                    console.log('> SSH: Correct install of gotty binary')
                    return resolve()
                } else {
                    console.log("> ERR: can't read version of gotty binary")
                    console.log(stdout, stderr, err)
                    return reject()
                }
            })
        })
    }
}
