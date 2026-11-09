# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module InvalidDateRangeEncodedTag
      extend Peal::Internal::Types::Enum

      INVALID_DATE_RANGE = "InvalidDateRange"
    end
  end
end
