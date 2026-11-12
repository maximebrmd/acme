# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FeedStoppedReason
      extend Peal::Internal::Types::Enum

      UNREACHABLE = "unreachable"
      NOT_A_FEED = "notAFeed"
      GONE = "gone"
      STARTER_GONE = "starterGone"
      QUEUE_GONE = "queueGone"
    end
  end
end
