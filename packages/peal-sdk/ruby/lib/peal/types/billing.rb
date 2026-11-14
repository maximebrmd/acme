# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Billing < Internal::Types::Model
      field :account, -> { Peal::Types::BillingAccount }, optional: true, nullable: false

      field :accounts, -> { Peal::Types::BillingAccountsUsage }, optional: false, nullable: false

      field :allowances, -> { Peal::Types::PlanAllowances }, optional: false, nullable: false

      field :currency, -> { String }, optional: false, nullable: false

      field :enabled, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :estimate, -> { Peal::Types::Money }, optional: false, nullable: true

      field :meters, -> { Internal::Types::Array[Peal::Types::BillingMeter] }, optional: false, nullable: true

      field :payment_failed, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "paymentFailed"

      field :payment_method, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "paymentMethod"

      field :plan, -> { Peal::Types::Plan }, optional: false, nullable: true

      field :plans, -> { Internal::Types::Array[Peal::Types::PlanOffer] }, optional: false, nullable: false

      field :rate_card, -> { Peal::Types::RateCard }, optional: false, nullable: true, api_name: "rateCard"

      field :subscription, -> { Peal::Types::BillingSubscription }, optional: false, nullable: true

      field :trial, -> { Peal::Types::TrialOffer }, optional: false, nullable: true

      field :upcoming_invoice, -> { Peal::Types::Money }, optional: false, nullable: true, api_name: "upcomingInvoice"

      field :usage, -> { Peal::Types::Usage }, optional: false, nullable: false

      field :vat_rate, -> { Integer }, optional: false, nullable: false, api_name: "vatRate"

      field :withdrawable_until, -> { String }, optional: false, nullable: true, api_name: "withdrawableUntil"

      field :x, -> { Peal::Types::XUsage }, optional: true, nullable: true
    end
  end
end
