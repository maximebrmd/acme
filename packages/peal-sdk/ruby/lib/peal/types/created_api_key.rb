# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CreatedAPIKey < Internal::Types::Model
      field :api_key, -> { Peal::Types::APIKey }, optional: false, nullable: false, api_name: "apiKey"

      field :key, -> { String }, optional: false, nullable: false
    end
  end
end
