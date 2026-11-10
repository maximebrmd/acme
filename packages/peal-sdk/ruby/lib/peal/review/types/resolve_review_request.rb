# frozen_string_literal: true

module Peal
  module Review
    module Types
      class ResolveReviewRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

        field :comment_id, -> { String }, optional: false, nullable: false, api_name: "commentId"

        field :resolved, -> { Internal::Types::Boolean }, optional: false, nullable: false
      end
    end
  end
end
