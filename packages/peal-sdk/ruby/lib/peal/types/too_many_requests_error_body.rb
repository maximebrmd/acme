# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TooManyRequestsErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::TooManyWebhookSendsEncoded }, key: "TOO_MANY_WEBHOOK_SENDS"

      member -> { Peal::Types::TooManyRequestsEncoded }, key: "TOO_MANY_REQUESTS"
    end
  end
end
