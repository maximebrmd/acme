# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module LinkedInVisibility
      extend Peal::Internal::Types::Enum

      PUBLIC = "public"
      CONNECTIONS = "connections"
      LOGGED_IN = "loggedIn"
    end
  end
end
