# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ContentViolationMediaTypeUnsupported < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :part, -> { Integer }, optional: true, nullable: false

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

      field :media_id, -> { String }, optional: false, nullable: false, api_name: "mediaId"

      field :content_type, -> { Peal::Types::MediaContentType }, optional: false, nullable: false, api_name: "contentType"
    end
  end
end
