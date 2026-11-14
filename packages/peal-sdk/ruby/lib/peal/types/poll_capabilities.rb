# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PollCapabilities < Internal::Types::Model
      field :choice_limit, -> { Peal::Types::TextLimit }, optional: false, nullable: false, api_name: "choiceLimit"

      field :duration_minutes, -> { Peal::Types::PollCapabilitiesDurationMinutes }, optional: false, nullable: true, api_name: "durationMinutes"

      field :max_choices, -> { Integer }, optional: false, nullable: false, api_name: "maxChoices"

      field :min_choices, -> { Integer }, optional: false, nullable: false, api_name: "minChoices"

      field :multiple_choice, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "multipleChoice"
    end
  end
end
