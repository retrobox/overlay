# Overlay

## Commands

Here is a list of some useful bash commands to get basic information from the system.

- get ip address

    `ip route get 8.8.8.8 2>/dev/null | awk '{print $NF; exit}'`

- get number of process running

    `ps ax | wc -l | tr -d " "`

- get system name

    `uname -srmo`

- get hostname

    `hostname`

- get uptime in seconds

    `/usr/bin/cut -d. -f1 /proc/uptime`

- get cpu temp in °C (divide by /1000)

    `/sys/class/thermal/thermal_zone0/temp`

- get gpu temp in °C

    `/opt/vc/bin/vcgencmd measure_temp`

- get free memory (in Kb)

    `grep MemFree /proc/meminfo | awk {'print $2'}`

- get total memory (in kB)

    `grep MemTotal /proc/meminfo | awk {'print $2'}`

- get disk usage

    `df -h /`

- scan wifi networks near

    `iwlist wlan0 scan`

- get current wifi ssid

    `iwgetid -r`