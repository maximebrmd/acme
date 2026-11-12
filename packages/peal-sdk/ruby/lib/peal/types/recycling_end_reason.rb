# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module RecyclingEndReason
      extend Peal::Internal::Types::Enum

      COMPLETED = "completed"
      STOPPED = "stopped"
      SOURCE_GONE = "sourceGone"
      STARTER_GONE = "starterGone"
      NO_CHANNELS = "noChannels"
      CONTENT_REJECTED = "contentRejected"
      PLAN_LIMIT = "planLimit"
      QUEUE_GONE = "queueGone"
      QUEUE_FULL = "queueFull"
    end
  end
end
