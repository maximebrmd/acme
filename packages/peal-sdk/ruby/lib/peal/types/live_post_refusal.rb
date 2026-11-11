# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module LivePostRefusal
      extend Peal::Internal::Types::Enum

      NOT_PUBLISHED = "notPublished"
      ALREADY_REMOVED = "alreadyRemoved"
      NO_PLATFORM_ID = "noPlatformId"
      NOT_SUPPORTED = "notSupported"
      CHANGE_IN_PROGRESS = "changeInProgress"
      CHANNEL_UNAVAILABLE = "channelUnavailable"
      BOOST_RUNNING = "boostRunning"
    end
  end
end
