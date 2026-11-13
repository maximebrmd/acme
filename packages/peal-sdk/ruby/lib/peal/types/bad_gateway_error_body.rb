# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BadGatewayErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::TextProviderRefusedEncoded }, key: "TEXT_PROVIDER_REFUSED"

      member -> { Peal::Types::AssistantFailedEncoded }, key: "ASSISTANT_FAILED"
    end
  end
end
