# frozen_string_literal: true

module Peal
  module Posts
    module Types
      class ReschedulePostsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

        field :body, -> { Peal::Types::PostSchedule }, optional: false, nullable: false
      end
    end
  end
end
