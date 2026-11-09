# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventSubscriptionStarted < Internal::Types::Model
      field :interval, -> { Peal::Types::BillingInterval }, optional: false, nullable: false

      field :plan, -> { Peal::Types::PaidPlan }, optional: false, nullable: false

      field :price, -> { Peal::Types::Money }, optional: false, nullable: false

      field :started_at, -> { String }, optional: false, nullable: false, api_name: "startedAt"

      field :trial_end, -> { String }, optional: false, nullable: true, api_name: "trialEnd"
    end
  end
end
