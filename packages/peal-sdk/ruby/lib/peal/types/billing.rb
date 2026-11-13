# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Billing < Internal::Types::Model
      field :account, -> { Peal::Types::BillingAccount }, optional: true, nullable: false

      field :allowances, -> { Peal::Types::PlanAllowances }, optional: false, nullable: false

      field :currency, -> { String }, optional: false, nullable: false

      field :enabled, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :plan, -> { Peal::Types::Plan }, optional: false, nullable: true

      field :plans, -> { Internal::Types::Array[Peal::Types::PlanOffer] }, optional: false, nullable: false

      field :subscription, -> { Peal::Types::BillingSubscription }, optional: false, nullable: true

      field :trial, -> { Peal::Types::TrialOffer }, optional: false, nullable: true

      field :usage, -> { Peal::Types::Usage }, optional: false, nullable: false

      field :vat_rate, -> { Integer }, optional: false, nullable: false, api_name: "vatRate"

      field :withdrawable_until, -> { String }, optional: false, nullable: true, api_name: "withdrawableUntil"
    end
  end
end
