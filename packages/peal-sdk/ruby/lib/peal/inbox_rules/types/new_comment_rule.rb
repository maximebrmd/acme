# frozen_string_literal: true

module Peal
  module InboxRules
    module Types
      class NewCommentRule < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :channel_id, -> { String }, optional: true, nullable: false, api_name: "channelId"

        field :keywords, -> { Internal::Types::Array[String] }, optional: false, nullable: false

        field :post_id, -> { String }, optional: true, nullable: false, api_name: "postId"

        field :reply, -> { String }, optional: false, nullable: false
      end
    end
  end
end
