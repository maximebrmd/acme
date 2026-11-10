# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module WebhookDisabledReason
      extend Peal::Internal::Types::Enum

      MANUAL = "manual"
      FAILING = "failing"
      GONE = "gone"
    end
  end
end
