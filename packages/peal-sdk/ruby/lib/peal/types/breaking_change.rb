# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BreakingChange < Internal::Types::Model
      field :change, -> { String }, optional: false, nullable: false

      field :reason, -> { String }, optional: false, nullable: false
    end
  end
end
