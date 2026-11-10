# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module AdAccountStatus
      extend Peal::Internal::Types::Enum

      ACTIVE = "active"
      IN_GRACE_PERIOD = "inGracePeriod"
      UNSETTLED = "unsettled"
      PENDING_REVIEW = "pendingReview"
      DISABLED = "disabled"
      CLOSED = "closed"
      UNKNOWN = "unknown"
    end
  end
end
