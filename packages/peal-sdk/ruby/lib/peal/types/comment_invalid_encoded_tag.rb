# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module CommentInvalidEncodedTag
      extend Peal::Internal::Types::Enum

      COMMENT_INVALID = "CommentInvalid"
    end
  end
end
