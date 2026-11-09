# frozen_string_literal: true

module Peal
  module Posts
    module Types
      class CreatePostsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :body, -> { Peal::Types::PostDraft }, optional: false, nullable: false
      end
    end
  end
end
