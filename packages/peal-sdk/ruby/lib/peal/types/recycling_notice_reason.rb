# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module RecyclingNoticeReason
      extend Peal::Internal::Types::Enum

      SOURCE_GONE = "sourceGone"
      STARTER_GONE = "starterGone"
      NO_CHANNELS = "noChannels"
      CONTENT_REJECTED = "contentRejected"
      PLAN_LIMIT = "planLimit"
      QUEUE_GONE = "queueGone"
      QUEUE_FULL = "queueFull"
      SOURCE_WITHDRAWN = "sourceWithdrawn"
    end
  end
end
