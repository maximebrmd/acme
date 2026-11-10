# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class OptionConstraintNotWith < Internal::Types::Model
      field :field, -> { String }, optional: false, nullable: false

      field :other, -> { String }, optional: false, nullable: false

      field :value, -> { String }, optional: false, nullable: false
    end
  end
end
