# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class RateCardAssistant < Internal::Types::Model
      field :margin, -> { Integer }, optional: false, nullable: false
    end
  end
end
