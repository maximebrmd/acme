# frozen_string_literal: true

module Peal
  module FollowUps
    module Types
      class NewFollowUpRule < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :channel_id, -> { String }, optional: true, nullable: false, api_name: "channelId"

        field :comment, -> { String }, optional: true, nullable: false

        field :likes, -> { Integer }, optional: false, nullable: false

        field :post_id, -> { String }, optional: true, nullable: false, api_name: "postId"

        field :repost, -> { Internal::Types::Boolean }, optional: true, nullable: false
      end
    end
  end
end
