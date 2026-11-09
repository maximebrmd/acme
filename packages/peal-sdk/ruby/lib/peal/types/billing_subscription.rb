# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BillingSubscription < Internal::Types::Model
      field :cancel_at_period_end, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "cancelAtPeriodEnd"

      field :current_period_end, -> { String }, optional: false, nullable: true, api_name: "currentPeriodEnd"

      field :interval, -> { Peal::Types::BillingInterval }, optional: false, nullable: false

      field :plan, -> { Peal::Types::PaidPlan }, optional: false, nullable: false

      field :started_at, -> { String }, optional: false, nullable: true, api_name: "startedAt"

      field :status, -> { Peal::Types::SubscriptionStatus }, optional: false, nullable: false

      field :trial_end, -> { String }, optional: false, nullable: true, api_name: "trialEnd"
    end
  end
end
