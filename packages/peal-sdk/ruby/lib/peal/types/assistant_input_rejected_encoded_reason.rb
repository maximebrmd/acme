# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module AssistantInputRejectedEncodedReason
      extend Peal::Internal::Types::Enum

      EMPTY = "empty"
      TOO_LONG = "tooLong"
    end
  end
end
