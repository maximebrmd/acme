# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    # A boost's budget in the ad account's minor units: `total` for its whole run, or `daily` for each day of it.
    class BoostBudget < Internal::Types::Model
      field :amount, -> { Integer }, optional: false, nullable: false

      field :kind, -> { Peal::Types::BoostBudgetKind }, optional: false, nullable: false
    end
  end
end
