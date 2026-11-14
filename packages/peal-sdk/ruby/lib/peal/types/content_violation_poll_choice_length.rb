# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ContentViolationPollChoiceLength < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :part, -> { Integer }, optional: true, nullable: false

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

      field :choice, -> { Integer }, optional: false, nullable: false

      field :length, -> { Integer }, optional: false, nullable: false

      field :maximum, -> { Integer }, optional: false, nullable: false

      field :unit, -> { Peal::Types::TextUnit }, optional: false, nullable: false
    end
  end
end
