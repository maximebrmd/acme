# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FacebookFormat
      extend Peal::Internal::Types::Enum

      FEED = "feed"
      STORY = "story"
      REEL = "reel"
    end
  end
end
