# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module PostNotReviewableEncodedStatus
      extend Peal::Internal::Types::Enum

      PUBLISHED = "published"
      CANCELLED = "cancelled"
    end
  end
end
