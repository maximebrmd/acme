# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PlanOffer < Internal::Types::Model
      field :allowances, -> { Peal::Types::PlanAllowances }, optional: false, nullable: false

      field :plan, -> { Peal::Types::Plan }, optional: false, nullable: false
    end
  end
end
