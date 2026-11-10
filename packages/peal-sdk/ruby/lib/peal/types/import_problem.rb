# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ImportProblem
      extend Peal::Internal::Types::Enum

      EMPTY = "empty"
      UNTERMINATED_QUOTE = "unterminatedQuote"
      UNKNOWN_COLUMN = "unknownColumn"
      REPEATED_COLUMN = "repeatedColumn"
      MISSING_COLUMN = "missingColumn"
      TOO_MANY_ROWS = "tooManyRows"
    end
  end
end
