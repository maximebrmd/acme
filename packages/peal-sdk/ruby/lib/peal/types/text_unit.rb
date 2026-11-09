# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module TextUnit
      extend Peal::Internal::Types::Enum

      GRAPHEMES = "graphemes"
      CODE_POINTS = "codePoints"
      UTF8BYTES = "utf8Bytes"
      EMOJI_BYTES = "emojiBytes"
      UTF16UNITS = "utf16Units"
      WEIGHTED = "weighted"
    end
  end
end
