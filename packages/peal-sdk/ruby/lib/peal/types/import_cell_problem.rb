# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ImportCellProblem < Internal::Types::Model
      field :column, -> { Peal::Types::ImportColumn }, optional: false, nullable: false

      field :problem, -> { Peal::Types::ImportCellProblemProblem }, optional: false, nullable: false
    end
  end
end
