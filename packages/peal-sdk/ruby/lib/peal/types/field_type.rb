# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FieldType
      extend Peal::Internal::Types::Enum

      BOOLEAN = "boolean"
      CHOICE = "choice"
      INTEGER = "integer"
      MEDIA = "media"
      MENTION_LIST = "mentionList"
      TEXT = "text"
      TEXT_LIST = "textList"
    end
  end
end
