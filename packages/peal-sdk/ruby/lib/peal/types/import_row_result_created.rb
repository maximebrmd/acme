# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ImportRowResultCreated < Internal::Types::Model
      field :post, -> { Peal::Types::Post }, optional: false, nullable: false

      field :replayed, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :row, -> { Integer }, optional: false, nullable: false
    end
  end
end
