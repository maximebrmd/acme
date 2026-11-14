# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FollowUpRuleStatus
      extend Peal::Internal::Types::Enum

      ACTIVE = "active"
      PAUSED = "paused"
      ENDED = "ended"
    end
  end
end
