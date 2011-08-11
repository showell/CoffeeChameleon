(function() {
  var Person, PersonInboundInterface, PersonOutboundInterface, PubSub, TieToPubSub, TieToWebServer, WebServer, alice, engineering, pubsub, web_server;
  WebServer = function() {
    var routes;
    routes = {};
    return {
      adapt: function(subroute, remote_methods) {
        var method, method_name, route, _results;
        _results = [];
        for (method_name in remote_methods) {
          method = remote_methods[method_name];
          route = subroute + "/" + method_name;
          _results.push(routes[route] = method);
        }
        return _results;
      },
      post: function(route, data) {
        return routes[route](data);
      }
    };
  };
  web_server = WebServer();
  web_server.adapt("/hello", {
    world: function() {
      return console.log("hello world");
    },
    mars: function() {
      return console.log("hello mars");
    }
  });
  web_server.post("/hello/world");
  web_server.post("/hello/mars");
  PubSub = function() {
    var channels;
    channels = {};
    return {
      subscribe: function(channel, callback) {
        channels[channel] || (channels[channel] = []);
        return channels[channel].push(callback);
      },
      publish: function(channel, data) {
        var callback, _i, _len, _ref, _results;
        channels[channel] || (channels[channel] = []);
        _ref = channels[channel];
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          callback = _ref[_i];
          _results.push(callback(data));
        }
        return _results;
      }
    };
  };
  pubsub = PubSub();
  pubsub.subscribe("/rss_feed", function(data) {
    return console.log("I am reading " + data);
  });
  pubsub.publish("/rss_feed", "NEWS OF THE DAY");
  Person = function(name) {
    var friends, self, wealth;
    wealth = 0;
    friends = [];
    return self = {
      add_wealth: function(money) {
        wealth += money;
        if (wealth > 100) {
          return self.celebrate();
        }
      },
      friend: function(friend) {
        friends.push(friend);
        if (friends.length >= 3) {
          return self.gloat();
        }
      },
      render: function() {
        return "Name: " + name + " Wealth: " + wealth + " friends: " + friends;
      },
      name: name,
      celebrate: function() {
        return console.log("I'm rich!!!!");
      },
      gloat: function() {
        return console.log("I'm popular");
      }
    };
  };
  alice = Person("alice");
  alice.friend("bob");
  alice.add_wealth(5);
  console.log(alice.render());
  PersonInboundInterface = function(person, inbound_interface) {
    var remote_methods;
    remote_methods = {
      add_wealth: function(data) {
        return person.add_wealth(data.money);
      },
      friend: function(data) {
        return person.friend(data.friend);
      }
    };
    return inbound_interface.adapt("/person/" + person.name, remote_methods);
  };
  PersonInboundInterface(alice, web_server);
  web_server.post("/person/alice/add_wealth", {
    money: 150
  });
  web_server.post("/person/alice/friend", {
    friend: "calvin"
  });
  console.log(alice.render());
  PersonOutboundInterface = function(person, outbound_interface) {
    var send;
    send = function(method_name, data) {
      var channel;
      channel = ("/person/" + person.name + "/") + method_name;
      return outbound_interface.publish(channel, data);
    };
    return person.gloat = function() {
      return send("gloat", person.render());
    };
  };
  PersonOutboundInterface(alice, pubsub);
  pubsub.subscribe("/person/alice/gloat", function(data) {
    return console.log("I am just noting that Alice is gloating");
  });
  pubsub.subscribe("/person/alice/gloat", function(data) {
    console.log("Alice is gloating:");
    return console.log("  " + data);
  });
  web_server.post("/person/alice/friend", {
    friend: "debbie"
  });
  engineering = function(name) {
    var employees, revenue, self;
    employees = [];
    revenue = 0;
    self = {
      add_staff: function(person) {
        return employees.push(person);
      },
      pay: function(money) {
        revenue += money;
        if (revenue > 100) {
          return self.report_earnings();
        }
      },
      report_earnings: function() {
        console.log("reporting earnings", revenue);
        return console.log("current staff", employees);
      },
      staff: function() {
        return employees;
      }
    };
    self.helpers = {
      resource_name: "/Department/" + name,
      web_interface: {
        add_staff: function(data) {
          return self.add_staff(data.person);
        },
        pay: function(data) {
          return self.pay(data.money);
        }
      },
      pubsub: {
        report_earnings: function() {
          return {
            revenue: revenue,
            staff: employees
          };
        }
      }
    };
    return self;
  };
  console.log("\n====Local");
  engineering = engineering("Engineering");
  engineering.add_staff("kate");
  engineering.pay(50);
  engineering.report_earnings();
  TieToWebServer = function(object, web_server) {
    var helpers;
    helpers = object.helpers;
    return web_server.adapt(helpers.resource_name, helpers.web_interface);
  };
  TieToWebServer(engineering, web_server);
  console.log("\n====Tied to WebServer");
  web_server.post("/Department/Engineering/add_staff", {
    person: "mike"
  });
  console.log(engineering.staff());
  TieToPubSub = function(object, pubsub) {
    var data_function, helpers, method_name, _ref;
    helpers = object.helpers;
    _ref = helpers.pubsub;
    for (method_name in _ref) {
      data_function = _ref[method_name];
      object[method_name] = function() {
        var channel, data;
        channel = helpers.resource_name + "/" + method_name;
        data = data_function();
        return pubsub.publish(channel, data);
      };
    }
    return null;
  };
  TieToPubSub(engineering, pubsub);
  pubsub.subscribe("/Department/Engineering/report_earnings", function(data) {
    return console.log("I only care about revenue: " + data.revenue);
  });
  console.log("\n====Tied to PubSub");
  engineering.pay(60);
}).call(this);
