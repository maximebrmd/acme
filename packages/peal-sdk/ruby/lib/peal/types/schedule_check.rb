# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ScheduleCheck
      extend Peal::Internal::Types::Enum

      OK = "ok"
      IN_PAST = "inPast"
      INVALID_TIME_ZONE = "invalidTimeZone"
    end
  end
end
