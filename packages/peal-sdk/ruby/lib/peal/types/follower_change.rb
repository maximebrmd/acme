# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class FollowerChange < Internal::Types::Model
      field :current, -> { Integer }, optional: false, nullable: true

      field :gained, -> { Integer }, optional: false, nullable: true
    end
  end
end
