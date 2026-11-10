# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ImportRowResultUnreadable < Internal::Types::Model
      field :cells, -> { Peal::Types::ImportRowResultUnreadableCells }, optional: true, nullable: false

      field :problems, -> { Internal::Types::Array[Peal::Types::ImportCellProblem] }, optional: false, nullable: false

      field :row, -> { Integer }, optional: false, nullable: false
    end
  end
end
