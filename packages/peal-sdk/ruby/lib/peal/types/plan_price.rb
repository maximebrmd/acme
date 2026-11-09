# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PlanPrice < Internal::Types::Model
      field :month, -> { Integer }, optional: false, nullable: false

      field :year, -> { Integer }, optional: false, nullable: false
    end
  end
end
