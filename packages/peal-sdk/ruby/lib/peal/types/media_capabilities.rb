# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MediaCapabilities < Internal::Types::Model
      field :alt_text, -> { Peal::Types::MediaCapabilitiesAltText }, optional: false, nullable: false, api_name: "altText"

      field :formats, -> { Internal::Types::Array[Peal::Types::MediaFormat] }, optional: false, nullable: true

      field :max_count, -> { Integer }, optional: false, nullable: false, api_name: "maxCount"

      field :max_videos, -> { Integer }, optional: false, nullable: true, api_name: "maxVideos"

      field :mixes_kinds, -> { Internal::Types::Boolean }, optional: false, nullable: true, api_name: "mixesKinds"

      field :required, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
