# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module RejectionReason
      extend Peal::Internal::Types::Enum

      SIZE_MISMATCH = "sizeMismatch"
      TYPE_MISMATCH = "typeMismatch"
    end
  end
end
