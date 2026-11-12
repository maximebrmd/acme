# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FeedItemReason
      extend Peal::Internal::Types::Enum

      EXISTING = "existing"
      TOO_MANY = "tooMany"
      EMPTY = "empty"
      CONTENT_REJECTED = "contentRejected"
      PLAN_LIMIT = "planLimit"
      QUEUE_FULL = "queueFull"
      NO_CHANNELS = "noChannels"
      DUPLICATE = "duplicate"
      QUEUE_GONE = "queueGone"
    end
  end
end
