# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ContentViolationVideoTooShort < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

      field :media_id, -> { String }, optional: false, nullable: false, api_name: "mediaId"

      field :duration_ms, -> { Integer }, optional: false, nullable: false, api_name: "durationMs"

      field :minimum_ms, -> { Integer }, optional: false, nullable: false, api_name: "minimumMs"
    end
  end
end
