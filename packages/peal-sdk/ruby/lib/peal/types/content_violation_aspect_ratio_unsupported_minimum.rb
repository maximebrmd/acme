# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ContentViolationAspectRatioUnsupportedMinimum < Internal::Types::Model
      extend Peal::Internal::Types::Union

      member -> { Float }

      member -> { Peal::Types::NonFiniteNumber }
    end
  end
end
