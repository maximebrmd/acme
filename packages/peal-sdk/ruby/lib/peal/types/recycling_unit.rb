# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module RecyclingUnit
      extend Peal::Internal::Types::Enum

      DAYS = "days"
      WEEKS = "weeks"
      MONTHS = "months"
    end
  end
end
