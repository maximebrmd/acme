# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module Weekday
      extend Peal::Internal::Types::Enum

      MONDAY = "monday"
      TUESDAY = "tuesday"
      WEDNESDAY = "wednesday"
      THURSDAY = "thursday"
      FRIDAY = "friday"
      SATURDAY = "saturday"
      SUNDAY = "sunday"
    end
  end
end
