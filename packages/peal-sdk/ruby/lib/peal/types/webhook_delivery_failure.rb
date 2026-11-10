# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module WebhookDeliveryFailure
      extend Peal::Internal::Types::Enum

      EXHAUSTED = "exhausted"
      GONE = "gone"
      ENDPOINT_DISABLED = "endpointDisabled"
      NOT_CONFIGURED = "notConfigured"
    end
  end
end
