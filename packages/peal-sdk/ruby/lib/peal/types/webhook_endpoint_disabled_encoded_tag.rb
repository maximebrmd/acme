# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module WebhookEndpointDisabledEncodedTag
      extend Peal::Internal::Types::Enum

      WEBHOOK_ENDPOINT_DISABLED = "WebhookEndpointDisabled"
    end
  end
end
