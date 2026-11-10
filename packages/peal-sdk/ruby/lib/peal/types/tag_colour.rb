# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module TagColour
      extend Peal::Internal::Types::Enum

      GRAY = "gray"
      RED = "red"
      ORANGE = "orange"
      AMBER = "amber"
      GREEN = "green"
      TEAL = "teal"
      BLUE = "blue"
      PURPLE = "purple"
      PINK = "pink"
    end
  end
end
