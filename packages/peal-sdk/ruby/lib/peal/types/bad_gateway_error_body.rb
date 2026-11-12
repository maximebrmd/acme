# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BadGatewayErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::AssistantFailedEncoded }, key: "ASSISTANT_FAILED"

      member -> { Peal::Types::ImageProviderRefusedEncoded }, key: "IMAGE_PROVIDER_REFUSED"
    end
  end
end
