# frozen_string_literal: true

module Peal
  module Feeds
    module Types
      class FeedPreviewRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :template, -> { String }, optional: true, nullable: false

        field :url, -> { String }, optional: false, nullable: false
      end
    end
  end
end
