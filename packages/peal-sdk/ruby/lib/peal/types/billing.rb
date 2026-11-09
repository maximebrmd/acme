# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Billing < Internal::Types::Model
      field :allowances, -> { Peal::Types::PlanAllowances }, optional: false, nullable: false

      field :enabled, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :plan, -> { Peal::Types::Plan }, optional: false, nullable: true

      field :plans, -> { Internal::Types::Array[Peal::Types::PlanOffer] }, optional: false, nullable: false

      field :subscription, -> { Peal::Types::BillingSubscription }, optional: false, nullable: true

      field :usage, -> { Peal::Types::Usage }, optional: false, nullable: false
    end
  end
end
