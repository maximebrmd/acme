# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ImportRowResultRefused < Internal::Types::Model
      field :refusal, -> { Peal::Types::PostRefusal }, optional: false, nullable: false

      field :row, -> { Integer }, optional: false, nullable: false
    end
  end
end
