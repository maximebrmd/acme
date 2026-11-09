# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module PostTargetStatus
      extend Peal::Internal::Types::Enum

      PENDING = "pending"
      PUBLISHING = "publishing"
      PUBLISHED = "published"
      FAILED = "failed"
      UNCONFIRMED = "unconfirmed"
      CANCELLED = "cancelled"
    end
  end
end
