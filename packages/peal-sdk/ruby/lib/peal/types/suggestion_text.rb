# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class SuggestionText < Internal::Types::Model
      field :text, -> { String }, optional: false, nullable: false
    end
  end
end
