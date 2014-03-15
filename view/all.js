var app = app || {};
var ENTER_KEY = 13;
var socket = io.connect('http://' + location.hostname + ':5000');

app.conf = {};
app.conf.username = undefined;
app.conf.touser = undefined;

var ybmp = {};
ybmp.decode = function(order) {
    var ex = /^[A-Z]{3}\:{3}\{.+}$/;
    if (ex.test) {
        var ret = {};
        var orders = order.split(':::');
        var json = '';
        var server = null;
        if (orders[1].indexOf('::') != -1) {
            json = orders[1].split('::')[1];

        } else {
            json = orders[1];
        }
        ret.order = orders[0];
        ret.data = JSON.parse(json);
        ret.server = server || '';
        return ret;
    } else {
        return "Error"
    }
};

ybmp.encode = function(order, server, data) {
    if (arguments.length == 2) {
        var data = server;
        var dataStr = JSON.stringify(data);
        return order + ':::' + dataStr;
    } else if (arguments.length == 3) {
        var dataStr = JSON.stringify(data);
        return order + ':::' + server + '::' + dataStr;
    }
};

(function($) {
    //
    'use strict';

    app.ViewBox = Backbone.View.extend({
        el : 'body',
        events : {
            //reg
            'click #savename' : 'regName',
            'keyup #username' : 'inputName',
            //
            'keyup #pubText' : 'pubText',
            'click #publish' : 'publish',
            'click .chatListBox li' : 'changeTar'
        },
        initialize : function() {
            var that = this;
            this.$input = this.$('#pubText');
            this.$all = this.$('.chatGroup li');
            this.listenTo(app.coll_users, 'add', this.renderUserOne);
            this.listenTo(app.chatMsg, 'add', this.newMsg);
            this.usename = undefined;

            // socket.on('regback', this.regCheck);
            // socket.on('receive', this.receive);
            // socket.on('newuser', this.newUser);
            // socket.on('deleteUser', _delUser);
            socket.on('ybmp', _ybmp);

            function _ybmp(data) {
                that.ybmp(data);
            }

            function _delUser(data) {
                console.log('deleteUser', data)
                that.delUser(data);
            }

        },
        ybmp : function(data) {
            var that = this;
            var order = ybmp.decode(data);
            console.log('%c     [client] << on "ybmp" -> ' + data, 'background:skyblue;color:red;');
            switch(order.order) {
                case "REG":
                    ybmpRge(order.data);
                    break;
                case "MSG":
                    ybmpMeg(order.data);
                    break;
                case "FRD":
                    ybmpFriend(order.data);
                    break;
                case "GRP":
                    ybmpGroup(order.data);
                    break;
            };

            function ybmpRge(info) {
                $('#login').modal('hide');
                app.conf.username = info.host;
                $('.loginBox').hide();
                $('.chatBox').show();
                that.getFriend();
                that.getGroup()
            };

            function ybmpMeg(info) {
                that.receive(info);
            };

            function ybmpFriend(data) {
                var make = false;
                for (var i in data.friends) {
                    if (!make) {
                        make = i;
                    }
                    that.newUser({
                        id : i,
                        name : data.friends[i].name
                    });
                };
                app.conf.touser = app.conf.touser || make;
                $('.chatList li[username=' + make + ']').addClass('active')
            };

            function ybmpGroup(data) {
                for (var i in data.friends) {
                    that.newUser({
                        id : i,
                        name : data.friends[i].name
                    });
                };
            }

        },
        getFriend : function(data) {
            var data = {
                "userid" : app.conf.username,
            }
            var msg = ybmp.encode('FRD', data);
            socket.emit('ybmp', msg);
            console.log('%c [S] get friend list', 'background:skyblue;color:red;');
            console.log('%c     [client] >> emit "ybmp" -> ' + msg, 'background:skyblue;color:red;');
        },
        getGroup : function(data) {
            var data = {
                "userid" : app.conf.username,
            }
            var msg = ybmp.encode('GRP', data);
            socket.emit('ybmp', msg);
            console.log('%c [S] get group list', 'background:skyblue;color:red;');
            console.log('%c     [client] >> emit "ybmp" -> ' + msg, 'background:skyblue;color:red;');
        },
        changeTar : function(data) {
            var that = $(data.target);

            if (that.attr('username') != app.conf.username) {
                app.conf.touser = that.attr('username') || 'all';
                this.$('.chatListBox li').removeClass('active');
                that.addClass('active').removeClass('unread');
                this.$('.chatMain').html('');
                this.readerTo(app.conf.touser);
                $('.chatBox title').html('CURRENT: ' + app.conf.touser);
            } else {
                this.$('.chatMain').html('<div>hum~ <br/> You want talk to yourself? <br/> that\'s sounds a little strange! <br/> <span style="color:red; font-weight:bold;">Try to talk with OTHERS~</span></div>')
            }
        },
        readerTo : function(user) {
            var msg = app.chatMsg.toUser(user);
            for (var i = 0, len = msg.length; i < len; i++) {
                this.renderMsgOne(msg[i])
            }
        },
        delUser : function(data) {
            var mod = app.coll_users.findWhere({
                name : data.username
            });
            app.coll_users.remove(mod);
        },
        newUser : function(data) {
            app.coll_users.add({
                id : data.id,
                name : data.name
            });
        },
        pubText : function(e) {
            var key = e.keyCode;
            if (key == ENTER_KEY) {
                this.pubtext();
            }
        },
        publish : function() {
            this.pubtext();
        },
        pubtext : function() {
            var text = this.$input.val();
            if (text) {
                var info = {
                    "poster" : app.conf.username,
                    "text" : text
                }
                if (app.conf.touser.indexOf('G') === 0) {
                    info.togroup = app.conf.touser
                } else {
                    info.touser = app.conf.touser
                }
                var msg = ybmp.encode('MSG', info);
                socket.emit('ybmp', msg);
                console.log('%c [S] send msg to server', 'background:skyblue;color:red;');
                console.log('%c     [client] >> emit "ybmp" -> ' + msg, 'background:skyblue;color:red;');
                this.$input.val('');
                this.$input.focus();
            }
        },
        inputName : function(e) {
            var key = e.keyCode;
            if (key == ENTER_KEY) {
                this.regName();
            }
        },
        regName : function() {
            var $username = $('#username').val();
            var val = $username;
            if (val) {
                var data = {
                    "host" : val,
                }
                var msg = ybmp.encode('REG', data);
                socket.emit('ybmp', msg);

                console.log('%c [S] reg to the Socket server ', 'background:skyblue;color:red;');
                console.log('%c     [client] >> emit "ybmp" -> ' + msg, 'background:skyblue;color:red;');
            }
        },
        receive : function(data) {
            if(data.togroup){
                data.touser=data.togroup
            }
            app.chatMsg.add(data);
        },
        renderUserOne : function(model) {
            this.useView = new app.ViewUList({
                model : model
            });
            this.$('ul.chatList').append(this.useView.render().$el);
        },
        newMsg : function(model) {
            if ((model.toJSON().poster !== app.conf.touser) && (model.toJSON().poster !== app.conf.username) && (model.toJSON().poster !== 'all')) {
                $('.chatListBox li[username="' + model.toJSON().poster + '"]').addClass('unread');
            }
            this.renderMsgOne(model);
        },
        renderMsgOne : function(model) {
            this.msgView = new app.ViewChat({
                model : model
            });
            if (model.toJSON().poster == app.conf.touser || model.toJSON().poster == app.conf.username) {
                this.$('.chatMain').append(this.msgView.reader().$el);
                $('.chatMain').scrollTop($('.chatMain')[0].scrollHeight);
            }
        }
    });

    //view for chat
    app.ViewUList = Backbone.View.extend({
        tagName : 'li',
        template : _.template('<span>unread</span><%- id %> : <%- name %>'),
        initialize : function() {
            this.listenTo(this.model, 'remove', this.remove);
        },
        render : function() {
            var json = this.model.toJSON();
            var html = this.template(json);
            this.$el.attr('username', json.id);
            if (app.conf.username == json.id) {
                this.$el.addClass('disabled');
            }
            this.$el.html(html);
            return this;
        },
        remove : function() {
            this.$el.remove();
        }
    });

    //view for chat
    app.ViewChat = Backbone.View.extend({
        template : _.template('<div class="chatbox <%= app.conf.username==poster ? "chat_other" : "chat_mine"  %> "><div class="icon"><%- poster %></div><div class="text"><%- text %></div></div>'),
        reader : function() {
            var json = this.model.toJSON();
            var html = this.template(json);
            this.$el.html(html);
            return this;
        }
    });

    //user
    app.ModelUser = Backbone.Model.extend({
        defaults : {
            id : 0,
            name : undefined
        }
    });
    app.users = Backbone.Collection.extend({
        model : app.ModelUser
    });
    app.coll_users = new app.users();

    //chat
    app.ModelChat = Backbone.Model.extend({
        defaults : {
            poster : undefined,
            touser : undefined,
            text : undefined
        }
    });
    app.chats = Backbone.Collection.extend({
        model : app.ModelChat,
        toUser : function(username) {
            var username = username || 'all';
            return this.filter(function(list) {
                return list.get('touser') == username || list.get('poster') == username;
            });
        }
    })
    app.chatMsg = new app.chats();

    new app.ViewBox();

})($);

