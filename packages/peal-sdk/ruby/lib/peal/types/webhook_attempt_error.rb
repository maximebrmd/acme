# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module WebhookAttemptError
      extend Peal::Internal::Types::Enum

      TIMEOUT = "timeout"
      CONNECTION = "connection"
      REFUSED = "refused"
    end
  end
end
