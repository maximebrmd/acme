# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    # How a post goes out on a YouTube channel. Scheduling needs `title` and `madeForKids`.
    class YouTubeOptions < Internal::Types::Model
      field :category_id, -> { String }, optional: true, nullable: false, api_name: "categoryId"

      field :contains_synthetic_media, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "containsSyntheticMedia"

      field :made_for_kids, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "madeForKids"

      field :notify_subscribers, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "notifySubscribers"

      field :privacy, -> { Peal::Types::YouTubePrivacy }, optional: true, nullable: false

      field :tags, -> { Internal::Types::Array[String] }, optional: true, nullable: false

      field :title, -> { String }, optional: true, nullable: false
    end
  end
end
