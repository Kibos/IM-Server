var con=require('./connect');

con.connect(5001,'10.21.3.62',function(socket){
	socket.write('ers')
})