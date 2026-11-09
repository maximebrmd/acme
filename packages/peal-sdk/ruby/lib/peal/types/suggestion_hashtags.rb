# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class SuggestionHashtags < Internal::Types::Model
      field :hashtags, -> { Internal::Types::Array[String] }, optional: false, nullable: false
    end
  end
end
