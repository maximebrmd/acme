# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module IdempotencyKeyReusedEncodedTag
      extend Peal::Internal::Types::Enum

      IDEMPOTENCY_KEY_REUSED = "IdempotencyKeyReused"
    end
  end
end
