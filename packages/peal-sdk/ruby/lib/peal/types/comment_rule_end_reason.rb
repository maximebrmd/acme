# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module CommentRuleEndReason
      extend Peal::Internal::Types::Enum

      STOPPED = "stopped"
      STARTER_GONE = "starterGone"
      CHANNEL_GONE = "channelGone"
    end
  end
end
