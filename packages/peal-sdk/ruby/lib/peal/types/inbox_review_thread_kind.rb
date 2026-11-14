# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module InboxReviewThreadKind
      extend Peal::Internal::Types::Enum

      REVIEWS = "reviews"
    end
  end
end
