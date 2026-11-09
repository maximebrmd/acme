# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TikTokCreator < Internal::Types::Model
      field :avatar_url, -> { String }, optional: false, nullable: true, api_name: "avatarUrl"

      field :comment_disabled, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "commentDisabled"

      field :duet_disabled, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "duetDisabled"

      field :max_video_duration_ms, -> { Integer }, optional: false, nullable: true, api_name: "maxVideoDurationMs"

      field :nickname, -> { String }, optional: false, nullable: false

      field :privacy_levels, -> { Internal::Types::Array[Peal::Types::TikTokPrivacyLevel] }, optional: false, nullable: false, api_name: "privacyLevels"

      field :stitch_disabled, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "stitchDisabled"

      field :username, -> { String }, optional: false, nullable: false
    end
  end
end
