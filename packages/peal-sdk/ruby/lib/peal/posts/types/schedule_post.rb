# frozen_string_literal: true

module Peal
  module Posts
    module Types
      class SchedulePost < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

        field :at, -> { String }, optional: false, nullable: false

        field :channel_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "channelIds"

        field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"
      end
    end
  end
end
