# frozen_string_literal: true

module Peal
  module Posts
    module Types
      class PostTags < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

        field :tag_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "tagIds"
      end
    end
  end
end
