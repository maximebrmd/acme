# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    # How a post goes out on a YouTube channel. Scheduling needs `title` and `madeForKids`; `thumbnailMediaId` names an
    # image of the library, set once the video is uploaded.
    class YouTubeOptions < Internal::Types::Model
      field :category_id, -> { String }, optional: true, nullable: false, api_name: "categoryId"

      field :contains_synthetic_media, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "containsSyntheticMedia"

      field :default_language, -> { String }, optional: true, nullable: false, api_name: "defaultLanguage"

      field :embeddable, -> { Internal::Types::Boolean }, optional: true, nullable: false

      field :license, -> { Peal::Types::YouTubeLicense }, optional: true, nullable: false

      field :made_for_kids, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "madeForKids"

      field :notify_subscribers, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "notifySubscribers"

      field :privacy, -> { Peal::Types::YouTubePrivacy }, optional: true, nullable: false

      field :public_stats_viewable, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "publicStatsViewable"

      field :recording_date, -> { String }, optional: true, nullable: false, api_name: "recordingDate"

      field :tags, -> { Internal::Types::Array[String] }, optional: true, nullable: false

      field :thumbnail_media_id, -> { String }, optional: true, nullable: false, api_name: "thumbnailMediaId"

      field :title, -> { String }, optional: true, nullable: false
    end
  end
end
