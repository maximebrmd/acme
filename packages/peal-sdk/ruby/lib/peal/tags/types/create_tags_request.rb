# frozen_string_literal: true

module Peal
  module Tags
    module Types
      class CreateTagsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :body, -> { Peal::Types::TagDetails }, optional: false, nullable: false
      end
    end
  end
end
