# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventSubscriptionWithdrawn < Internal::Types::Model
      field :plan, -> { Peal::Types::PaidPlan }, optional: false, nullable: false

      field :refunded, -> { Peal::Types::Money }, optional: false, nullable: false

      field :withdrawn_at, -> { String }, optional: false, nullable: false, api_name: "withdrawnAt"
    end
  end
end
