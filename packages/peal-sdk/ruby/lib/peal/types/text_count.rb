# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TextCount < Internal::Types::Model
      field :length, -> { Integer }, optional: false, nullable: false

      field :maximum, -> { Integer }, optional: false, nullable: false

      field :unit, -> { Peal::Types::TextUnit }, optional: false, nullable: false
    end
  end
end
