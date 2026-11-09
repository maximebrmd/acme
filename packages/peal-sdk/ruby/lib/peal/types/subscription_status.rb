# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module SubscriptionStatus
      extend Peal::Internal::Types::Enum

      INCOMPLETE = "incomplete"
      INCOMPLETE_EXPIRED = "incomplete_expired"
      TRIALING = "trialing"
      ACTIVE = "active"
      PAST_DUE = "past_due"
      CANCELED = "canceled"
      UNPAID = "unpaid"
      PAUSED = "paused"
    end
  end
end
