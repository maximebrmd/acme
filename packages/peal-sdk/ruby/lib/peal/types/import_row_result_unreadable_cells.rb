# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ImportRowResultUnreadableCells < Internal::Types::Model
      field :expected, -> { Integer }, optional: false, nullable: false

      field :found, -> { Integer }, optional: false, nullable: false
    end
  end
end
