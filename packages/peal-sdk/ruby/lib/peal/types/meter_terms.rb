# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MeterTerms < Internal::Types::Model
      field :allowance, -> { Integer }, optional: false, nullable: false

      field :allowance_without, -> { Integer }, optional: false, nullable: false, api_name: "allowanceWithout"

      field :ceiling, -> { Integer }, optional: false, nullable: true
    end
  end
end
