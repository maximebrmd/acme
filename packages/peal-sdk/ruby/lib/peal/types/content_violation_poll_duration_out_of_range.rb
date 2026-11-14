# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ContentViolationPollDurationOutOfRange < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :part, -> { Integer }, optional: true, nullable: false

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

      field :duration_minutes, -> { Integer }, optional: false, nullable: false, api_name: "durationMinutes"

      field :maximum_minutes, -> { Integer }, optional: false, nullable: false, api_name: "maximumMinutes"

      field :minimum_minutes, -> { Integer }, optional: false, nullable: false, api_name: "minimumMinutes"
    end
  end
end
