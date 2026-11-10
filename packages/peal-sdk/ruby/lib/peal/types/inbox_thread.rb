# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxThread < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :collection_ended, -> { Peal::Types::InboxCollectionEnd }, optional: false, nullable: true, api_name: "collectionEnded"

      field :comments, -> { Integer }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :last_collected_at, -> { String }, optional: false, nullable: true, api_name: "lastCollectedAt"

      field :last_comment_at, -> { String }, optional: false, nullable: true, api_name: "lastCommentAt"

      field :permalink, -> { String }, optional: false, nullable: true

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

      field :published_at, -> { String }, optional: false, nullable: false, api_name: "publishedAt"

      field :target_id, -> { String }, optional: false, nullable: false, api_name: "targetId"

      field :unanswered, -> { Integer }, optional: false, nullable: false
    end
  end
end
