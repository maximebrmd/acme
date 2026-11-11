# frozen_string_literal: true

module Peal
  module Posts
    module Types
      class QueuePost < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

        field :channel_ids, -> { Internal::Types::Array[String] }, optional: true, nullable: false, api_name: "channelIds"

        field :queue_id, -> { String }, optional: true, nullable: false, api_name: "queueId"
      end
    end
  end
end
