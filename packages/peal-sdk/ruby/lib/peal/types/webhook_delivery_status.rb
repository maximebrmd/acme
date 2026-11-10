# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module WebhookDeliveryStatus
      extend Peal::Internal::Types::Enum

      PENDING = "pending"
      SUCCEEDED = "succeeded"
      FAILED = "failed"
    end
  end
end
