# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module NonFiniteNumber
      extend Peal::Internal::Types::Enum

      INFINITY = "Infinity"
      NA_N = "NaN"
    end
  end
end
