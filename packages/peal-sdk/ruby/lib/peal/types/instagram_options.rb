# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    # How a post goes out on an Instagram account. Scheduling needs none of them; `shareToFeed`, `coverMediaId`,
    # `thumbOffsetMs`, `audioName` and `trialReel` are for a post of one video (a reel), and each of `collaborators`
    # receives an invitation.
    class InstagramOptions < Internal::Types::Model
      field :audio_name, -> { String }, optional: true, nullable: false, api_name: "audioName"

      field :collaborators, -> { Internal::Types::Array[String] }, optional: true, nullable: false

      field :cover_media_id, -> { String }, optional: true, nullable: false, api_name: "coverMediaId"

      field :share_to_feed, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "shareToFeed"

      field :thumb_offset_ms, -> { Integer }, optional: true, nullable: false, api_name: "thumbOffsetMs"

      field :trial_reel, -> { Peal::Types::InstagramTrialReel }, optional: true, nullable: false, api_name: "trialReel"
    end
  end
end
