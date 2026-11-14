# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PollCapabilitiesDurationMinutes < Internal::Types::Model
      field :maximum, -> { Integer }, optional: false, nullable: false

      field :minimum, -> { Integer }, optional: false, nullable: false
    end
  end
end
