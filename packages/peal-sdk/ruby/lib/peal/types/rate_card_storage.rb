# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class RateCardStorage < Internal::Types::Model
      field :minimum, -> { Integer }, optional: false, nullable: false

      field :per_account, -> { Integer }, optional: false, nullable: false, api_name: "perAccount"

      field :without_payment_method, -> { Integer }, optional: false, nullable: false, api_name: "withoutPaymentMethod"
    end
  end
end
