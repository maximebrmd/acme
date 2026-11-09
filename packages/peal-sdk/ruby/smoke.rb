# The smoke test, which scripts/test.ts runs against a stand-in API: the
# health check, then the signed-in user with a bearer token.
require "uri"
require "peal"

url = URI(ENV.fetch("PEAL_API_URL"))

Peal.configure do |config|
  config.scheme = url.scheme
  config.host = "#{url.host}:#{url.port}"
  config.base_path = ""
  config.server_index = nil
  config.access_token = "peal_test"
end

Peal::SystemApi.new.health
me = Peal::SessionApi.new.session_me

unless me.user.email == "ada@example.test" && me.impersonated_by.nil? && me.user.image.nil? &&
       me.workspaces.first.permissions.include?("post:schedule")
  abort "Unexpected answer: #{me.inspect}"
end

puts "ok"
