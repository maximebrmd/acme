# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module AutomationStopReason
      extend Peal::Internal::Types::Enum

      STARTER_GONE = "starterGone"
      CHANNEL_GONE = "channelGone"
    end
  end
end
