# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class RecyclingInterval < Internal::Types::Model
      field :count, -> { Integer }, optional: false, nullable: false

      field :unit, -> { Peal::Types::RecyclingUnit }, optional: false, nullable: false
    end
  end
end
