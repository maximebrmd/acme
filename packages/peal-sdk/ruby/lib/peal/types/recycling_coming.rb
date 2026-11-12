# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class RecyclingComing < Internal::Types::Model
      field :at, -> { String }, optional: false, nullable: false

      field :occurrence, -> { Integer }, optional: false, nullable: false

      field :variant, -> { Integer }, optional: false, nullable: true
    end
  end
end
