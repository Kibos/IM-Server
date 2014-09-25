#!/bin/sh
if pm2 l | grep online > /dev/null
then {
echo "------------- Server is restarting -------------"
pm2 restart all
}
else {
echo '--------------'
date
echo '--------------'
pm2 delete all;
cd brain-server;
pm2 start app.js -x -n 'brain-server:4999';
cd ../node-server;
pm2 start app.js -x -n 'node-server:4001';
cd ../dispatch-server;
pm2 start app.js -x -n 'dispatch-server:4008';
cd ../group-server;
pm2 start app.js -x -n 'group-server:4101';
pm2 logs;
}
fi

