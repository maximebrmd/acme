# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FeedUnreadableEncodedReason
      extend Peal::Internal::Types::Enum

      NOT_A_FEED = "notAFeed"
      TOO_LARGE = "tooLarge"
      UNREACHABLE = "unreachable"
    end
  end
end
