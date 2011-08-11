# Simulate a web server.  It doesn't actually listen over HTTP for this demo,
# but it very easily could.
WebServer = ->
  routes = {}
  adapt: (subroute, remote_methods) ->
    for method_name, method of remote_methods
      route = subroute + "/" + method_name
      routes[route] = method
  post: (route, data) ->
    routes[route] data
web_server = WebServer()
web_server.adapt "/hello",
  world: -> console.log "hello world"
  mars: -> console.log "hello mars"
web_server.post "/hello/world"
web_server.post "/hello/mars"

# Likewise, simulate a Faye-like mechanism for publishing to channels.
PubSub = ->
  channels = {}
  subscribe: (channel, callback) ->
    channels[channel] ||= []
    channels[channel].push callback
  publish: (channel, data) ->
    channels[channel] ||= []
    for callback in channels[channel]
      callback(data)
pubsub = PubSub()
pubsub.subscribe "/rss_feed", (data) -> console.log "I am reading #{data}"
pubsub.publish "/rss_feed", "NEWS OF THE DAY"

# Define a Person object that we just use locally.
Person = (name) ->
  wealth = 0
  friends = []
  self =
    add_wealth: (money) -> 
      wealth += money
      if wealth > 100
        self.celebrate()
    friend: (friend) ->
      friends.push(friend)
      if friends.length >= 3
        self.gloat()
    render: -> "Name: #{name} Wealth: #{wealth} friends: #{friends}"
    name: name
    celebrate: -> console.log "I'm rich!!!!"
    gloat: -> console.log "I'm popular"
    
alice = Person "alice" 
alice.friend "bob"
alice.add_wealth 5
console.log alice.render()
    
# Now we can create a Proxie interface that wraps some methods.
# We are concrete about the methods we wrap, but we allow the
# remote_interface to be pluggable.
PersonInboundInterface = (person, inbound_interface) ->
  remote_methods =
    add_wealth: (data) -> person.add_wealth(data.money)
    friend: (data) -> person.friend(data.friend)
  inbound_interface.adapt("/person/#{person.name}", remote_methods)
  
# Now we can make "alice" a REST-ful like object.
PersonInboundInterface(alice, web_server)
web_server.post "/person/alice/add_wealth", {money: 150}
web_server.post "/person/alice/friend", {friend: "calvin"}
console.log alice.render()
    
# Now let's proxie outbound methods
PersonOutboundInterface = (person, outbound_interface) ->
  send = (method_name, data) ->
    channel = "/person/#{person.name}/" + method_name
    outbound_interface.publish(channel, data)
  person.gloat = -> send("gloat", person.render())

# Now, tie alice into PubSub, which supports a publish method.
PersonOutboundInterface(alice, pubsub)

# And set up subscribers
pubsub.subscribe "/person/alice/gloat", (data) ->
  console.log "I am just noting that Alice is gloating"
  
pubsub.subscribe "/person/alice/gloat", (data) ->
  console.log "Alice is gloating:"
  console.log "  #{data}"
  
# And then give her a third friend, so that she gloats.
web_server.post "/person/alice/friend", {friend: "debbie"}

# We've proven that we can integrate Person with a WebServer-like
# inbound mechanism and a PubSub-like outbound mechanism with two
# helper methods:
#
#   - PersonInboundInterface
#   - PersonOutboundInterface
#
# It would be nice to have objects be able to just publish their own interface.
engineering = (name) ->
  employees = []
  revenue = 0
  # set up normal interface first
  self =
    add_staff: (person) -> employees.push person
    pay: (money) ->
      revenue += money
      if revenue > 100
        self.report_earnings()
    report_earnings: ->
      console.log "reporting earnings", revenue
      console.log "current staff", employees
    staff: -> employees
  # But also set up helpers that we can use later
  self.helpers =
    resource_name: "/Department/#{name}"
    web_interface:
      add_staff: (data) -> self.add_staff(data.person)
      pay: (data) -> self.pay(data.money)
    outbound:
      report_earnings: (send) -> send
        revenue: revenue
        staff: employees
  return self
        
# Try it locally first
console.log "\n====Local"
engineering = engineering("Engineering")
engineering.add_staff("kate")
engineering.pay(50)
engineering.report_earnings()
        
# Now create a generic Chameleon function that exposes
# an object to WebServer.
TieToWebServer = (object) ->
  helpers = object.helpers
  web_server.adapt helpers.resource_name, helpers.web_interface
  
TieToWebServer(engineering)
console.log "\n====Tied to WebServer"
web_server.post "/Department/Engineering/add_staff", {person: "mike"}
console.log engineering.staff()
      
    

  
    
    
    
