# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module WebhookTurnOffReason
      extend Peal::Internal::Types::Enum

      FAILING = "failing"
      GONE = "gone"
    end
  end
end
