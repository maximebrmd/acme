# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ImportRowResultValid < Internal::Types::Model
      field :row, -> { Integer }, optional: false, nullable: false
    end
  end
end
