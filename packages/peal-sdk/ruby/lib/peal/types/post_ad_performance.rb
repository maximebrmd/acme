# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostAdPerformance < Internal::Types::Model
      field :boosts, -> { Internal::Types::Array[Peal::Types::Boost] }, optional: false, nullable: false

      field :organic, -> { Internal::Types::Array[Peal::Types::OrganicCounts] }, optional: false, nullable: false

      field :paid, -> { Internal::Types::Array[Peal::Types::PostAdPerformancePaidItem] }, optional: false, nullable: false
    end
  end
end
