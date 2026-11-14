# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module PostPartsNotSent
      extend Peal::Internal::Types::Enum

      FIRST_COMMENT = "firstComment"
      LATER_PARTS = "laterParts"
    end
  end
end
