# frozen_string_literal: true

module Peal
  module Posts
    module Types
      class LivePostEdit < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

        field :target_id, -> { String }, optional: false, nullable: false, api_name: "targetId"

        field :wait, -> { String }, optional: true, nullable: false

        field :part, -> { Integer }, optional: true, nullable: false

        field :text, -> { String }, optional: false, nullable: false
      end
    end
  end
end
