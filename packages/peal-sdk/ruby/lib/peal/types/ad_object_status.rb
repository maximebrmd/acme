# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module AdObjectStatus
      extend Peal::Internal::Types::Enum

      ACTIVE = "active"
      PAUSED = "paused"
      IN_REVIEW = "inReview"
      REJECTED = "rejected"
      WITH_ISSUES = "withIssues"
      ARCHIVED = "archived"
      DELETED = "deleted"
      UNKNOWN = "unknown"
    end
  end
end
