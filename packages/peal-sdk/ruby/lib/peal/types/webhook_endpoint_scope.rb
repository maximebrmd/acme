# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module WebhookEndpointScope
      extend Peal::Internal::Types::Enum

      WORKSPACE = "workspace"
      PARTNER = "partner"
    end
  end
end
