# frozen_string_literal: true

module Peal
  module Media
    module Types
      class UsageMediaRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :media_id, -> { String }, optional: false, nullable: false, api_name: "mediaId"
      end
    end
  end
end
