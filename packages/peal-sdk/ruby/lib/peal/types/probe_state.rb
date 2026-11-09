# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ProbeState
      extend Peal::Internal::Types::Enum

      PENDING = "pending"
      UNAVAILABLE = "unavailable"
      UNREADABLE = "unreadable"
      TIMED_OUT = "timedOut"
      TOO_LARGE = "tooLarge"
      TOOL_FAILED = "toolFailed"
    end
  end
end
