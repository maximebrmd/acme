# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class RateCardAPIRequestsPerMinute < Internal::Types::Model
      field :on_request, -> { Integer }, optional: false, nullable: false, api_name: "onRequest"

      field :without_payment_method, -> { Integer }, optional: false, nullable: false, api_name: "withoutPaymentMethod"
    end
  end
end
