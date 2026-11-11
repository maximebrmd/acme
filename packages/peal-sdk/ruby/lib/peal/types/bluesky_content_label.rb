# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module BlueskyContentLabel
      extend Peal::Internal::Types::Enum

      SEXUAL = "sexual"
      NUDITY = "nudity"
      PORN = "porn"
      GRAPHIC_MEDIA = "graphic-media"
    end
  end
end
