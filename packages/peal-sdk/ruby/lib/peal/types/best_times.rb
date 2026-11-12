# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BestTimes < Internal::Types::Model
      field :best, -> { Internal::Types::Array[Peal::Types::BestTimesHour] }, optional: false, nullable: false

      field :buckets, -> { Internal::Types::Array[Peal::Types::BestTimesHour] }, optional: false, nullable: false

      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :counted, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :days, -> { Integer }, optional: false, nullable: false

      field :enough, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :from, -> { String }, optional: false, nullable: false

      field :minimum_posts, -> { Integer }, optional: false, nullable: false, api_name: "minimumPosts"

      field :minimum_posts_per_hour, -> { Integer }, optional: false, nullable: false, api_name: "minimumPostsPerHour"

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

      field :posts, -> { Integer }, optional: false, nullable: false

      field :recent, -> { Integer }, optional: false, nullable: false

      field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"

      field :to, -> { String }, optional: false, nullable: false
    end
  end
end
