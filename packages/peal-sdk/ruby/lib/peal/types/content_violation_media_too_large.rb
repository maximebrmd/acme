# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ContentViolationMediaTooLarge < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :part, -> { Integer }, optional: true, nullable: false

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

      field :media_id, -> { String }, optional: false, nullable: false, api_name: "mediaId"

      field :byte_size, -> { Integer }, optional: false, nullable: false, api_name: "byteSize"

      field :maximum, -> { Integer }, optional: false, nullable: false
    end
  end
end
