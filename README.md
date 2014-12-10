a chat server built with node js + mongodb + redis

Chat Of YiBan
====
![image](https://github.com/haozxuan/chat/raw/master/images/server_list.png)

Brain Server
----
control all servers, and transpond all the server information
Node Server
----
deal with chat logic include send all types message
Group Server
----
deal with chat logic main content is group message
Dispatch Server
----
deal with third party
Monitor Server
----
monitor all server status
Start
----
- cd ./pm2-start/
- pm2 start process_dev.json

like this

![image](https://github.com/haozxuan/chat/raw/master/images/server_list.png)

    or
- cd ./node-server
- node app.js (only can person chat)