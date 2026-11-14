# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ArticleViolationTooManyTerms < Internal::Types::Model
      field :field, -> { Peal::Types::ArticleViolationTooManyTermsField }, optional: false, nullable: false

      field :maximum, -> { Integer }, optional: false, nullable: false
    end
  end
end
