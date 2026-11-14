# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Poll < Internal::Types::Model
      field :choices, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :duration_minutes, -> { Integer }, optional: false, nullable: false, api_name: "durationMinutes"

      field :multiple_choice, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "multipleChoice"
    end
  end
end
