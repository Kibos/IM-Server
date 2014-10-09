#!/bin/bash

//TODO
cd /usr/local/app/www/nodeSocket/ybmp

if ifconfig | grep '10.21.67.20'
then {
cd brain-server
pm2 start app_4999.js -x -n 'brainServer:4999'
}
elif ifconfig | grep '10.21.67.21'
then {
cd brain-server
pm2 start app_4998.js -x -n 'brainServer:4998'
}
elif ifconfig | grep '10.21.67.22'
then {
cd dispatch-server
pm2 start app_4201.js -x -n 'dispatchServer:4201'
}
elif ifconfig | grep '10.21.67.23'
then {
cd dispatch-server
pm2 start app_4202.js -x -n 'dispatchServer:4202'
}
elif ifconfig | grep '10.21.67.25'
then {
cd node-server
pm2 start app_4251.js -x -n 'nodeServer:4251'
pm2 start app_4252.js -x -n 'nodeServer:4252'
}
elif ifconfig | grep '10.21.67.26'
then {
cd node-server
pm2 start app_4261.js -x -n 'nodeServer:4261'
pm2 start app_4262.js -x -n 'nodeServer:4262'
}
elif ifconfig | grep '10.21.67.27'
then {
cd node-server
pm2 start app_4271.js -x -n 'nodeServer:4271'
pm2 start app_4272.js -x -n 'nodeServer:4272'
}
elif ifconfig | grep '10.21.67.28'
then {
cd group-server
pm2 start app_4101.js -x -n 'groupServer:4101'
}
elif ifconfig | grep '10.21.67.29'
then {
cd group-server
pm2 start app_4102.js -x -n 'groupServer:4102'
}
else
echo 'This is a fast start bash.'
fi
