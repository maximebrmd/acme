# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ServiceUnavailableErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::BillingUnavailableEncoded }, key: "BILLING_UNAVAILABLE"

      member -> { Peal::Types::MediaStoreUnavailableEncoded }, key: "MEDIA_STORE_UNAVAILABLE"
    end
  end
end
