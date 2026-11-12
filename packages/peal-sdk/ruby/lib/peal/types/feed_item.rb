# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class FeedItem < Internal::Types::Model
      field :item_at, -> { String }, optional: false, nullable: true, api_name: "itemAt"

      field :outcome, -> { Peal::Types::FeedItemOutcome }, optional: false, nullable: false

      field :picture_skipped, -> { Peal::Types::FeedPictureSkip }, optional: false, nullable: true, api_name: "pictureSkipped"

      field :post_id, -> { String }, optional: false, nullable: true, api_name: "postId"

      field :reason, -> { Peal::Types::FeedItemReason }, optional: false, nullable: true

      field :seen_at, -> { String }, optional: false, nullable: false, api_name: "seenAt"
    end
  end
end
