# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module YouTubeLicense
      extend Peal::Internal::Types::Enum

      YOUTUBE = "youtube"
      CREATIVE_COMMON = "creativeCommon"
    end
  end
end
