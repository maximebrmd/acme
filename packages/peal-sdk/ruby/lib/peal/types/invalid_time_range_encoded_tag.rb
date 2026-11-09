# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module InvalidTimeRangeEncodedTag
      extend Peal::Internal::Types::Enum

      INVALID_TIME_RANGE = "InvalidTimeRange"
    end
  end
end
