# frozen_string_literal: true

module Peal
  module Feeds
    module Types
      class NewFeed < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :attach_picture, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "attachPicture"

        field :channel_ids, -> { Internal::Types::Array[String] }, optional: true, nullable: false, api_name: "channelIds"

        field :channel_set_id, -> { String }, optional: true, nullable: false, api_name: "channelSetId"

        field :mode, -> { Peal::Types::FeedMode }, optional: true, nullable: false

        field :queue_id, -> { String }, optional: true, nullable: false, api_name: "queueId"

        field :template, -> { String }, optional: true, nullable: false

        field :url, -> { String }, optional: false, nullable: false
      end
    end
  end
end
