# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CommentRule < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: true, api_name: "channelId"

      field :channels, -> { Internal::Types::Array[Peal::Types::ChannelCommentRule] }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :ended_reason, -> { Peal::Types::CommentRuleEndReason }, optional: false, nullable: true, api_name: "endedReason"

      field :id, -> { String }, optional: false, nullable: false

      field :keywords, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :matches, -> { Internal::Types::Array[Peal::Types::CommentRuleMatch] }, optional: false, nullable: false

      field :post_id, -> { String }, optional: false, nullable: true, api_name: "postId"

      field :reply, -> { String }, optional: false, nullable: false

      field :started_by, -> { String }, optional: false, nullable: true, api_name: "startedBy"

      field :status, -> { Peal::Types::CommentRuleStatus }, optional: false, nullable: false
    end
  end
end
