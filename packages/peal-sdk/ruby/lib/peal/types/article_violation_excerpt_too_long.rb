# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ArticleViolationExcerptTooLong < Internal::Types::Model
      field :maximum, -> { Integer }, optional: false, nullable: false
    end
  end
end
