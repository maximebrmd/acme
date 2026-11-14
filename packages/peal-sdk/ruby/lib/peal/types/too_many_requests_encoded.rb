# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TooManyRequestsEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::TooManyRequestsEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :limit, -> { Integer }, optional: false, nullable: false

      field :policy, -> { Peal::Types::TooManyRequestsEncodedPolicy }, optional: true, nullable: false

      field :retry_after_seconds, -> { Integer }, optional: false, nullable: false, api_name: "retryAfterSeconds"

      field :window_seconds, -> { Integer }, optional: false, nullable: false, api_name: "windowSeconds"

      field :with_payment_method, -> { Integer }, optional: true, nullable: false, api_name: "withPaymentMethod"
    end
  end
end
