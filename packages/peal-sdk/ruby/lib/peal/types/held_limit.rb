# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module HeldLimit
      extend Peal::Internal::Types::Enum

      CHANNELS = "channels"
      MEMBERS = "members"
      MEDIA_STORAGE = "mediaStorage"
    end
  end
end
