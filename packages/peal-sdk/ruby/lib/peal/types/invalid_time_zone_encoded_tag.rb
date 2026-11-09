# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module InvalidTimeZoneEncodedTag
      extend Peal::Internal::Types::Enum

      INVALID_TIME_ZONE = "InvalidTimeZone"
    end
  end
end
