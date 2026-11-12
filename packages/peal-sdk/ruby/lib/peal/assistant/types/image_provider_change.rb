# frozen_string_literal: true

module Peal
  module Assistant
    module Types
      class ImageProviderChange < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :api_key, -> { String }, optional: true, nullable: false, api_name: "apiKey"

        field :base_url, -> { String }, optional: false, nullable: false, api_name: "baseUrl"

        field :model, -> { String }, optional: false, nullable: false
      end
    end
  end
end
