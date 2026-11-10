# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module NoticeEventAdBoostChangedChange
      extend Peal::Internal::Types::Enum

      STARTED = "started"
      ENDED = "ended"
      FAILED = "failed"
      BUDGET_REACHED = "budgetReached"
      UNCONFIRMED = "unconfirmed"
    end
  end
end
