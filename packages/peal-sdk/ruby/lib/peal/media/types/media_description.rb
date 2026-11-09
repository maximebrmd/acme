# frozen_string_literal: true

module Peal
  module Media
    module Types
      class MediaDescription < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :media_id, -> { String }, optional: false, nullable: false, api_name: "mediaId"

        field :alt_text, -> { String }, optional: false, nullable: true, api_name: "altText"
      end
    end
  end
end
