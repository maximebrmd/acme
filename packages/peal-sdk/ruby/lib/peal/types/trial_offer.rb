# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TrialOffer < Internal::Types::Model
      field :available, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :days, -> { Integer }, optional: false, nullable: false

      field :plan, -> { Peal::Types::PaidPlan }, optional: false, nullable: false
    end
  end
end
