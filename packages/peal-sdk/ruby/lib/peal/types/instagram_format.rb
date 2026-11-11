# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module InstagramFormat
      extend Peal::Internal::Types::Enum

      FEED = "feed"
      STORY = "story"
    end
  end
end
