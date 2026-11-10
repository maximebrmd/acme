# frozen_string_literal: true

module Peal
  module Posts
    module Types
      class SearchPostsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :author_id, -> { String }, optional: true, nullable: false, api_name: "authorId"

        field :channel_id, -> { String }, optional: true, nullable: false, api_name: "channelId"

        field :created_via, -> { Peal::Types::PostOriginVia }, optional: true, nullable: false, api_name: "createdVia"

        field :cursor, -> { String }, optional: true, nullable: false

        field :from, -> { String }, optional: true, nullable: false

        field :limit, -> { String }, optional: true, nullable: false

        field :outcome, -> { Peal::Types::PostOutcome }, optional: true, nullable: false

        field :platform, -> { Peal::Types::Platform }, optional: true, nullable: false

        field :sort, -> { Peal::Types::PostSort }, optional: true, nullable: false

        field :status, -> { Peal::Types::PostStatus }, optional: true, nullable: false

        field :tag_id, -> { String }, optional: true, nullable: false, api_name: "tagId"

        field :to, -> { String }, optional: true, nullable: false
      end
    end
  end
end
