# frozen_string_literal: true

module Peal
  module Tags
    module Types
      class DeleteTagsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :tag_id, -> { String }, optional: false, nullable: false, api_name: "tagId"
      end
    end
  end
end
