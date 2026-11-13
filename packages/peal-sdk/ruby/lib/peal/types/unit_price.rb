# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UnitPrice < Internal::Types::Model
      field :cents, -> { Integer }, optional: false, nullable: false

      field :per, -> { Integer }, optional: false, nullable: false
    end
  end
end
