# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FeedPictureSkip
      extend Peal::Internal::Types::Enum

      NOT_PUBLIC = "notPublic"
      UNREACHABLE = "unreachable"
      TOO_LARGE = "tooLarge"
      NOT_AN_IMAGE = "notAnImage"
      STORAGE_FULL = "storageFull"
      BUSY = "busy"
      NOT_ALLOWED = "notAllowed"
      FAILED = "failed"
    end
  end
end
