# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FeedTemplateInvalidEncodedReason
      extend Peal::Internal::Types::Enum

      EMPTY = "empty"
      TOO_LONG = "tooLong"
      UNKNOWN_PLACEHOLDER = "unknownPlaceholder"
    end
  end
end
