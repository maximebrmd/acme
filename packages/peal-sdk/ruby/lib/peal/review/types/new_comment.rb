# frozen_string_literal: true

module Peal
  module Review
    module Types
      class NewComment < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

        field :anchor, -> { Peal::Review::Types::NewCommentAnchor }, optional: true, nullable: false

        field :parent_id, -> { String }, optional: true, nullable: false, api_name: "parentId"

        field :text, -> { String }, optional: false, nullable: false
      end
    end
  end
end
