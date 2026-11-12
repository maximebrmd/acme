# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FeedItemOutcome
      extend Peal::Internal::Types::Enum

      MADE = "made"
      HELD_BACK = "heldBack"
      SKIPPED = "skipped"
      CLAIMED = "claimed"
      ABANDONED = "abandoned"
    end
  end
end
