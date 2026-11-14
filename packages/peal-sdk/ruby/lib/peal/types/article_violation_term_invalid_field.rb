# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ArticleViolationTermInvalidField
      extend Peal::Internal::Types::Enum

      CATEGORIES = "categories"
      TAGS = "tags"
    end
  end
end
