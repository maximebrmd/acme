# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class RecyclingRuleVariantsItem < Internal::Types::Model
      field :overrides, -> { Internal::Types::Array[Peal::Types::TextOverride] }, optional: false, nullable: false

      field :text, -> { String }, optional: false, nullable: false
    end
  end
end
