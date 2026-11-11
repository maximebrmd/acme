# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    # How a post goes out on a TikTok account. Scheduling needs `privacyLevel`; `videoCoverTimestampMs` is for a video,
    # `photoTitle`, `autoAddMusic` and `photoCoverIndex` for photos.
    class TikTokOptions < Internal::Types::Model
      field :ai_generated, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "aiGenerated"

      field :auto_add_music, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "autoAddMusic"

      field :brand_content, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "brandContent"

      field :brand_organic, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "brandOrganic"

      field :commercial_content, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "commercialContent"

      field :disable_comment, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "disableComment"

      field :disable_duet, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "disableDuet"

      field :disable_stitch, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "disableStitch"

      field :photo_cover_index, -> { Integer }, optional: true, nullable: false, api_name: "photoCoverIndex"

      field :photo_title, -> { String }, optional: true, nullable: false, api_name: "photoTitle"

      field :privacy_level, -> { Peal::Types::TikTokPrivacyLevel }, optional: true, nullable: false, api_name: "privacyLevel"

      field :video_cover_timestamp_ms, -> { Integer }, optional: true, nullable: false, api_name: "videoCoverTimestampMs"
    end
  end
end
