# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Suggestion < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::SuggestionText }, key: "TEXT"

      member -> { Peal::Types::SuggestionHashtags }, key: "HASHTAGS"
    end
  end
end
