# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BillingMeter < Internal::Types::Model
      field :allowance, -> { Integer }, optional: false, nullable: false

      field :billable, -> { Integer }, optional: false, nullable: false

      field :ceiling, -> { Peal::Types::Money }, optional: false, nullable: true

      field :estimate, -> { Peal::Types::Money }, optional: false, nullable: true

      field :group, -> { Peal::Types::SpendGroup }, optional: false, nullable: true

      field :meter, -> { Peal::Types::Meter }, optional: false, nullable: false

      field :most, -> { Integer }, optional: false, nullable: true

      field :price, -> { Peal::Types::UnitPrice }, optional: false, nullable: false

      field :price_confirmed, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "priceConfirmed"

      field :resets_at, -> { String }, optional: false, nullable: false, api_name: "resetsAt"

      field :used, -> { Integer }, optional: false, nullable: false
    end
  end
end
