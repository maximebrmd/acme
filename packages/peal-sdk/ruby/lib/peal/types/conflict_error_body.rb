# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ConflictErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::ExternalIDTakenEncoded }, key: "EXTERNAL_ID_TAKEN"

      member -> { Peal::Types::IdempotencyKeyReusedEncoded }, key: "IDEMPOTENCY_KEY_REUSED"
    end
  end
end
