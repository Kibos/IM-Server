#!/bin/sh
times1=`/bin/cat /root/.pm2/logs/logsServer-out-7.log |wc -l`
sleep 5
times2=`/bin/cat /root/.pm2/logs/logsServer-out-7.log |wc -l`

if [ $times1 -eq $times2 ]
then
echo -n "0"
exit
else
echo -n "1"
exit
fi;