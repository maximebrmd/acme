# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module TooManyWebhookEndpointsEncodedTag
      extend Peal::Internal::Types::Enum

      TOO_MANY_WEBHOOK_ENDPOINTS = "TooManyWebhookEndpoints"
    end
  end
end
