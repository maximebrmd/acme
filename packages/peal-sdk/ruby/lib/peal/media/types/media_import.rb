# frozen_string_literal: true

module Peal
  module Media
    module Types
      class MediaImport < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :alt_text, -> { String }, optional: true, nullable: true, api_name: "altText"

        field :url, -> { String }, optional: false, nullable: false
      end
    end
  end
end
