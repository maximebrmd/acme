# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BoostDetail < Internal::Types::Model
      field :boost, -> { Peal::Types::Boost }, optional: false, nullable: false

      field :steps, -> { Internal::Types::Array[Peal::Types::BoostStep] }, optional: false, nullable: false
    end
  end
end
