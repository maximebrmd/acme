# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class LimitedCount < Internal::Types::Model
      field :count, -> { Integer }, optional: false, nullable: false

      field :maximum, -> { Integer }, optional: false, nullable: true
    end
  end
end
