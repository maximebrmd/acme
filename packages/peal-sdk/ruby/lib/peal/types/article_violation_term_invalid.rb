# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ArticleViolationTermInvalid < Internal::Types::Model
      field :field, -> { Peal::Types::ArticleViolationTermInvalidField }, optional: false, nullable: false
    end
  end
end
