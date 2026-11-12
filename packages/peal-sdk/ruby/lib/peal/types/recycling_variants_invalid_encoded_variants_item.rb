# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class RecyclingVariantsInvalidEncodedVariantsItem < Internal::Types::Model
      field :variant, -> { Integer }, optional: false, nullable: false

      field :violations, -> { Internal::Types::Array[Peal::Types::ContentViolation] }, optional: false, nullable: false
    end
  end
end
