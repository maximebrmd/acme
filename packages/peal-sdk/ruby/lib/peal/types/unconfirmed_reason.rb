# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module UnconfirmedReason
      extend Peal::Internal::Types::Enum

      NO_RESPONSE = "noResponse"
      UNREADABLE_RESPONSE = "unreadableResponse"
      INTERRUPTED = "interrupted"
      ADAPTER_FAILURE = "adapterFailure"
      STILL_PROCESSING = "stillProcessing"
    end
  end
end
