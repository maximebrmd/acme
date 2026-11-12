# frozen_string_literal: true

module Peal
  module Assistant
    module Types
      class ImageProviderAssistantRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"
      end
    end
  end
end
