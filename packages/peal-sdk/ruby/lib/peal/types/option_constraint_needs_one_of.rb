# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class OptionConstraintNeedsOneOf < Internal::Types::Model
      field :field, -> { String }, optional: false, nullable: false

      field :one_of, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "oneOf"
    end
  end
end
