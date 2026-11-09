# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ContentViolationVideoTooLong < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

      field :media_id, -> { String }, optional: false, nullable: false, api_name: "mediaId"

      field :duration_ms, -> { Integer }, optional: false, nullable: false, api_name: "durationMs"

      field :maximum_ms, -> { Integer }, optional: false, nullable: false, api_name: "maximumMs"
    end
  end
end
