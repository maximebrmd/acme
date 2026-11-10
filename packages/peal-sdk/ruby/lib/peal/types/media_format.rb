# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MediaFormat < Internal::Types::Model
      field :content_type, -> { Peal::Types::MediaContentType }, optional: false, nullable: false, api_name: "contentType"

      field :kind, -> { Peal::Types::MediaKind }, optional: false, nullable: false

      field :max_aspect_ratio, -> { Float }, optional: false, nullable: true, api_name: "maxAspectRatio"

      field :max_byte_size, -> { Integer }, optional: false, nullable: true, api_name: "maxByteSize"

      field :max_duration_ms, -> { Integer }, optional: false, nullable: true, api_name: "maxDurationMs"

      field :max_media_with, -> { Integer }, optional: false, nullable: true, api_name: "maxMediaWith"

      field :max_pixels, -> { Integer }, optional: false, nullable: true, api_name: "maxPixels"

      field :max_side, -> { Integer }, optional: false, nullable: true, api_name: "maxSide"

      field :min_aspect_ratio, -> { Float }, optional: false, nullable: true, api_name: "minAspectRatio"

      field :min_byte_size, -> { Integer }, optional: false, nullable: true, api_name: "minByteSize"

      field :min_duration_ms, -> { Integer }, optional: false, nullable: true, api_name: "minDurationMs"

      field :min_side, -> { Integer }, optional: false, nullable: true, api_name: "minSide"
    end
  end
end
