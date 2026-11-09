# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module PlanLimitReachedEncodedTag
      extend Peal::Internal::Types::Enum

      PLAN_LIMIT_REACHED = "PlanLimitReached"
    end
  end
end
