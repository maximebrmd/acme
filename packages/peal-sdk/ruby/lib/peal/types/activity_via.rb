# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ActivityVia
      extend Peal::Internal::Types::Enum

      SESSION = "session"
      API_KEY = "apiKey"
      OAUTH = "oauth"
      MCP = "mcp"
      PARTNER_KEY = "partnerKey"
      CONNECT_LINK = "connectLink"
    end
  end
end
