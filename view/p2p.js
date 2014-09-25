var app = app || {};
var ENTER_KEY = 13;
var socket = io.connect('http://10.21.3.63:4001');

app.conf = {};
app.conf.username = undefined;
app.conf.touser = 'all';

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
        el : '#chatBox',
        events : {
            'click #savename' : 'regName',
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
            socket.on('receive', this.receive);
            socket.on('newuser', this.newUser);
            socket.on('getUser', _showUser);
            socket.on('deleteUser', _delUser);
            socket.on('ybmp', _ybmp);

            function _ybmp(data) {
                that.ybmp(data);
            }

            function _showUser(data) {
                console.log('showUser', data)
                that.showUser(data);
            }

            function _delUser(data) {
                console.log('deleteUser', data)
                that.delUser(data);
            }


            $('#login').modal();
            var that = this;
            $('#login').find('#savename').off().on('click', function() {
                that.regName();
            });

            $('#username').on('keyup', _inputName);
            function _inputName(e) {
                that.inputName(e);
            }

        },
        ybmp : function(data) {
            var that = this;
            if(typeof (data)==='string'){
                var rec = JSON.parse(data);   
            }else{
                var rec=data;
            }
            
            var order = rec.order;
            switch(order) {
                case "REG":
                    ybmpRge(rec);
                    break;
                case "MSG":
                    ybmpMeg(rec);
                    break;
            };

            function ybmpRge(info) {
                $('#login').modal('hide');
                app.conf.username = info.host;
            };

            function ybmpMeg(info) {
                console.log('ybmsg', info)
                that.receive(info);
            };

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
        showUser : function(data) {
            for (var i = 0, len = data.length; i < len; i++) {
                this.newUser({
                    username : data[i]
                });
            };
        },
        newUser : function(data) {
            app.coll_users.add({
                name : data.username
            });
        },
        pubText : function(e) {
            var key = e.keyCode;
            if (key == ENTER_KEY) {
                if (app.conf.username) {
                    this.pubtext();
                } else {
                    $('#login').modal();
                    var that = this;
                    $('#login').find('#savename').off('click').on('click', function() {
                        that.regName();
                    })
                }
            }
        },
        publish : function() {
            if (app.conf.username != undefined) {
                this.pubtext();
            } else {
                $('#login').modal();
                var that = this;
                $('#login').find('#savename').off().on('click', function() {
                    that.regName();
                })
            }
        },
        pubtext : function() {
            var to = app.conf.username == 1 ? 2 : 1, text = this.$input.val();
            var info = {
                "order":"MSG",
                "poster" : app.conf.username,
                "touser" : to,
                "text" : text
            }
            socket.emit('ybmp', info);
            this.$input.val('');
            this.$input.focus();
        },
        inputName : function(e) {
            var key = e.keyCode;
            if (key == ENTER_KEY) {
                this.regName();
            }
        },
        regName : function() {
            var $username = $('#login').find('#username');
            var val = $username.val();
            var info = {
                "order" : "REG",
                "host" : val
            }
            if (val) {
                socket.emit('ybmp', info);
            }
        },
        receive : function(data) {
            app.chatMsg.add(data);
        },
        readerAll : function() {
            this.$all.html('All (' + app.coll_users.length + ')')
        },
        renderUserOne : function(model) {
            this.useView = new app.ViewUList({
                model : model
            });
            this.$('ul.chatList').append(this.useView.render().$el);
            this.readerAll();
        },
        newMsg : function(model) {
            if ((model.toJSON().poster !== app.conf.touser) && (model.toJSON().poster !== app.conf.username) && (model.toJSON().poster !== 'all')) {
                $('.chatListBox li[username="' + model.toJSON().poster + '"]').addClass('unread');
            }
            this.renderMsgOne(model);
        },
        renderMsgOne : function(model) {
            console.log('------2', model)
            // var isAll = (app.conf.touser == 'all') && (model.toJSON().touser == 'all');
            // var isPoster = (model.toJSON().poster == app.conf.username) && (model.toJSON().touser == app.conf.touser);
            // var isRecerver = (model.toJSON().poster == app.conf.touser) && (model.toJSON().touser == app.conf.username);

            //if (isAll || isPoster || isRecerver) {
            this.msgView = new app.ViewChat({
                model : model
            });
            this.$('.chatMain').append(this.msgView.reader().$el);
            $('.chatMain').scrollTop($('.chatMain')[0].scrollHeight);
            //}
        }
    });

    //view for chat
    app.ViewUList = Backbone.View.extend({
        tagName : 'li',
        template : _.template('<span>unread</span><%- name %>'),
        initialize : function() {
            this.listenTo(this.model, 'remove', this.remove);
            //this.listenTo(this.model, 'change', this.change);
        },
        render : function() {
            var json = this.model.toJSON();
            var html = this.template(json);
            this.$el.attr('username', json.name);
            if (app.conf.username == json.name) {
                this.$el.addClass('disabled')
            }
            this.$el.html(html);
            return this;
        },
        // change : function() {
        // if (this.model.toJSON().unread) {
        // this.$el.addClass('unread');
        // } else {
        // this.$el.removeClass('unread');
        // }
        // },
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
            name : undefined,
            unread : 0
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
            touser : 'all',
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

