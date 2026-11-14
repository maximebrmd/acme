# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxReviewThread < Internal::Types::Model
      field :average_rating, -> { Peal::Types::InboxReviewThreadAverageRating }, optional: false, nullable: true, api_name: "averageRating"

      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :id, -> { String }, optional: false, nullable: false

      field :kind, -> { Peal::Types::InboxReviewThreadKind }, optional: false, nullable: false

      field :last_collected_at, -> { String }, optional: false, nullable: true, api_name: "lastCollectedAt"

      field :last_review_at, -> { String }, optional: false, nullable: true, api_name: "lastReviewAt"

      field :reviews, -> { Integer }, optional: false, nullable: false

      field :total_review_count, -> { Integer }, optional: false, nullable: true, api_name: "totalReviewCount"

      field :unanswered, -> { Integer }, optional: false, nullable: false
    end
  end
end
