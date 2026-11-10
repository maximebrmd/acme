# frozen_string_literal: true

module Peal
  module Tags
    module Types
      class UpdateTagsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :tag_id, -> { String }, optional: false, nullable: false, api_name: "tagId"

        field :body, -> { Peal::Types::TagDetails }, optional: false, nullable: false
      end
    end
  end
end
