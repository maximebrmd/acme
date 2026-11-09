# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module PostOutcome
      extend Peal::Internal::Types::Enum

      PUBLISHED = "published"
      PARTIALLY_PUBLISHED = "partiallyPublished"
      UNCONFIRMED = "unconfirmed"
      FAILED = "failed"
      CANCELLED = "cancelled"
    end
  end
end
