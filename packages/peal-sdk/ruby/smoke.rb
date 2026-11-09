# frozen_string_literal: true

# The smoke test, which scripts/test.ts runs against a stand-in API: the
# health check, the signed-in user with a bearer token, and the error a
# refused token raises.
require "peal"
require "socket"
require "uri"

# The client sends plain HTTP to localhost alone, and the stand-in is on the
# Docker host: a forwarder on this container's loopback carries the bytes.
stand_in = URI(ENV.fetch("PEAL_API_URL"))
forwarder = TCPServer.new("127.0.0.1", 0)

Thread.new do
  loop do
    Thread.new(forwarder.accept) do |client|
      upstream = TCPSocket.new(stand_in.host, stand_in.port)
      [[client, upstream], [upstream, client]].map do |from, to|
        Thread.new do
          IO.copy_stream(from, to)
          to.close_write
        end
      end.each(&:join)
    ensure
      client.close
      upstream&.close
    end
  end
end

base_url = "http://127.0.0.1:#{forwarder.addr[1]}"
peal = Peal::Client.new(base_url: base_url, token: "peal_test")

peal.system.health
me = peal.session.me

unless me.user.email == "ada@example.test" && me.impersonated_by.nil? && me.user.image.nil? &&
       me.workspaces[0].permissions.include?("post:schedule")
  abort "Unexpected answer: #{me.inspect}"
end

begin
  Peal::Client.new(base_url: base_url, token: "refused").session.me
  abort "A refused token got an answer"
rescue Peal::Errors::UnauthorizedError
  # The 401 the stand-in answers a refused token.
end

puts "ok"
