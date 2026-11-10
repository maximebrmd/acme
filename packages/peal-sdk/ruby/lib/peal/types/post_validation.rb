# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostValidation < Internal::Types::Model
      field :channels, -> { Internal::Types::Array[Peal::Types::ChannelPreview] }, optional: false, nullable: false

      field :duplicates, -> { Internal::Types::Array[Peal::Types::DuplicateOnChannel] }, optional: false, nullable: false

      field :plan_limit, -> { Peal::Types::PlanShortfall }, optional: false, nullable: true, api_name: "planLimit"

      field :schedule, -> { Peal::Types::ScheduleCheck }, optional: false, nullable: true

      field :unknown_channels, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "unknownChannels"

      field :unknown_media, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "unknownMedia"

      field :valid, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :violations, -> { Internal::Types::Array[Peal::Types::ContentViolation] }, optional: false, nullable: false
    end
  end
end
