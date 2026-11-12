# frozen_string_literal: true

module Peal
  module ShortLinks
    module Types
      class ListShortLinksRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :channel_id, -> { String }, optional: true, nullable: false, api_name: "channelId"

        field :cursor, -> { String }, optional: true, nullable: false

        field :from, -> { String }, optional: true, nullable: false

        field :limit, -> { String }, optional: true, nullable: false

        field :post_id, -> { String }, optional: true, nullable: false, api_name: "postId"

        field :to, -> { String }, optional: true, nullable: false
      end
    end
  end
end
