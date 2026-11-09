# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TopPost < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :engagement, -> { Integer }, optional: false, nullable: false

      field :metrics, -> { Peal::Types::PostMetrics }, optional: false, nullable: false

      field :permalink, -> { String }, optional: false, nullable: true

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

      field :published_at, -> { String }, optional: false, nullable: false, api_name: "publishedAt"

      field :target_id, -> { String }, optional: false, nullable: false, api_name: "targetId"
    end
  end
end
