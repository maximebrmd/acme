# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module AssistantFailedEncodedReason
      extend Peal::Internal::Types::Enum

      UNREACHABLE = "unreachable"
      TIMED_OUT = "timedOut"
      DECLINED = "declined"
      INVALID_ANSWER = "invalidAnswer"
    end
  end
end
