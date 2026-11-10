# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ContentViolationOptionsForOtherPlatform < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :part, -> { Integer }, optional: true, nullable: false

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

      field :options_platform, -> { Peal::Types::Platform }, optional: false, nullable: false, api_name: "optionsPlatform"
    end
  end
end
