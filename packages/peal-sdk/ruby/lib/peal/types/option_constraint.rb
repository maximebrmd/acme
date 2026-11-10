# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class OptionConstraint < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::OptionConstraintNeedsOneOf }, key: "NEEDS_ONE_OF"

      member -> { Peal::Types::OptionConstraintNotWith }, key: "NOT_WITH"
    end
  end
end
